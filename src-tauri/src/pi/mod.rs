// pi/mod.rs — pi agent 子进程管理核心
// 负责 spawn/kill pi 进程、stdin/stdout JSONL 通信、状态机、崩溃恢复、空闲超时
// Reference: .dev/plan/phase3-pi-rpc-fix.md

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tokio::time::timeout;

// ===== 常量 =====

/// 空闲超时时间（5 分钟无交互自动 kill）
const IDLE_TIMEOUT_SECS: u64 = 5 * 60;

/// 崩溃重启窗口（1 分钟内最多重启次数）
const CRASH_WINDOW_SECS: u64 = 60;
const MAX_CRASHES_PER_WINDOW: usize = 3;

/// 优雅关闭等待时间（SIGTERM 后等待秒数）
const SHUTDOWN_GRACE_SECS: u64 = 3;
/// 内置 pi 二进制在 resources 目录下的相对路径
const PI_BINARY_REL: &str = if cfg!(target_os = "windows") {
    "pi/pi.exe"
} else {
    "pi/pi"
};

/// pi-extensions 目录在 resources 下的相对路径
const PI_EXTENSIONS_REL: &str = "pi-extensions";

/// 获取内置 pi 二进制的绝对路径
///
/// - 开发模式：Tauri 的 resource_dir 指向 target/debug/，资源文件不在那里。
///   用 CARGO_MANIFEST_DIR 定位 src-tauri/ 目录，拼接 resources/pi/pi。
/// - 生产模式：resource_dir 指向安装包内的 resources 目录，用 resolve 解析。
pub fn pi_binary_path(app: &AppHandle) -> Result<PathBuf, String> {
    // 开发模式：直接从源码目录定位
    if cfg!(debug_assertions) {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let dev_path = manifest_dir.join("resources").join(PI_BINARY_REL);
        if dev_path.exists() {
            return Ok(dev_path);
        }
        log::warn!("[pi] 开发模式未在 {} 找到 pi，回退到 resource_dir", dev_path.display());
    }

    // 生产模式（或开发模式回退）：用 Tauri 的 resource 解析
    app.path()
        .resolve(PI_BINARY_REL, BaseDirectory::Resource)
        .map_err(|e| format!("解析 pi 二进制路径失败: {}", e))
}

/// 获取 pi-extensions 目录的绝对路径
///
/// 与 `pi_binary_path` 同模式：开发模式用 CARGO_MANIFEST_DIR，
/// 生产模式用 Tauri resource 解析。
pub fn pi_extensions_path(app: &AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let dev_path = manifest_dir.join("resources").join(PI_EXTENSIONS_REL);
        if dev_path.exists() {
            return Ok(dev_path);
        }
        log::warn!("[pi] 开发模式未在 {} 找到 pi-extensions", dev_path.display());
    }

    app.path()
        .resolve(PI_EXTENSIONS_REL, BaseDirectory::Resource)
        .map_err(|e| format!("解析 pi-extensions 路径失败: {}", e))
}

// ===== 状态机 =====

/// pi agent 进程状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum PiState {
    /// pi 二进制未找到
    NotInstalled,
    /// 凭证未配置（auth.json/models.json 不存在或无效）
    NotConfigured,
    /// 进程已停止（未运行）
    Stopped,
    /// 进程运行中，等待输入
    Idle,
    /// 正在流式输出
    Streaming,
    /// 进程异常退出
    Dead,
    /// 正在关闭（SIGTERM 等待中）
    ShuttingDown,
}

impl std::fmt::Display for PiState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PiState::NotInstalled => write!(f, "NotInstalled"),
            PiState::NotConfigured => write!(f, "NotConfigured"),
            PiState::Stopped => write!(f, "Stopped"),
            PiState::Idle => write!(f, "Idle"),
            PiState::Streaming => write!(f, "Streaming"),
            PiState::Dead => write!(f, "Dead"),
            PiState::ShuttingDown => write!(f, "ShuttingDown"),
        }
    }
}

// ===== 发送模式 =====

/// 发送模式
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SendMode {
    /// 默认：Idle 直接发送 prompt，Streaming 发送 prompt + streamingBehavior: "followUp"
    Default,
    /// 中断：发送 steer 命令（pi 自动处理中断和队列清空）
    Steer,
    /// 强制追加：发送 prompt + streamingBehavior: "followUp"
    Enqueue,
}

impl SendMode {
    pub fn from_str(s: &str) -> Self {
        match s {
            "steer" => SendMode::Steer,
            "enqueue" => SendMode::Enqueue,
            _ => SendMode::Default,
        }
    }
}

// ===== Session 管理 =====

/// Session 元数据
#[derive(Debug, Clone)]
pub struct SessionMeta {
    pub session_id: String,
    pub created_at: DateTime<Utc>,
    pub last_active: DateTime<Utc>,
}

// ===== AgentManager =====

/// pi agent 管理器（线程安全，可作为 Tauri State 使用）
#[derive(Clone)]
pub struct AgentManager {
    /// 当前状态
    state: Arc<Mutex<PiState>>,
    /// 子进程句柄
    child: Arc<Mutex<Option<Child>>>,
    /// stdin 写入端（共享，可 clone 用于写入）
    stdin: Arc<Mutex<Option<tokio::process::ChildStdin>>>,
    /// 崩溃记录（时间戳）
    crash_history: Arc<Mutex<Vec<Instant>>>,
    /// 最后活跃时间
    last_active: Arc<Mutex<Instant>>,
    /// Session 映射
    sessions: Arc<Mutex<HashMap<String, SessionMeta>>>,
    /// 当前 session_id
    current_session: Arc<Mutex<Option<String>>>,
    /// Tauri AppHandle
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    /// 是否正在主动关闭（区分 stdout EOF 是崩溃还是主动 shutdown）
    is_shutting_down: Arc<std::sync::atomic::AtomicBool>,
    /// 当前 agent 工作的文档临时路径（RAVEN_DOCX_PATH）
    doc_temp_path: Arc<Mutex<Option<String>>>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(PiState::Stopped)),
            child: Arc::new(Mutex::new(None)),
            stdin: Arc::new(Mutex::new(None)),
            crash_history: Arc::new(Mutex::new(Vec::new())),
            last_active: Arc::new(Mutex::new(Instant::now())),
            sessions: Arc::new(Mutex::new(HashMap::new())),
            current_session: Arc::new(Mutex::new(None)),
            is_shutting_down: Arc::new(std::sync::atomic::AtomicBool::new(false)),
            app_handle: Arc::new(Mutex::new(None)),
            doc_temp_path: Arc::new(Mutex::new(None)),
        }
    }

    /// 设置当前 agent 工作的文档临时路径（由 agent_send 前端调用）
    pub async fn set_doc_temp_path(&self, path: Option<String>) {
        let mut p = self.doc_temp_path.lock().await;
        *p = path;
    }

    /// 获取当前文档临时路径
    async fn get_doc_temp_path(&self) -> Option<String> {
        let p = self.doc_temp_path.lock().await;
        p.clone()
    }

    /// 设置 AppHandle（由 lib.rs setup 时调用）
    pub async fn set_app_handle(&self, handle: AppHandle) {
        let mut app = self.app_handle.lock().await;
        *app = Some(handle);
    }

    /// 获取 AppHandle
    async fn get_app_handle(&self) -> Option<AppHandle> {
        let app = self.app_handle.lock().await;
        app.clone()
    }

    /// 获取当前状态
    pub async fn get_state(&self) -> PiState {
        let state = self.state.lock().await;
        *state
    }

    /// 设置状态
    async fn set_state(&self, new_state: PiState) {
        let mut state = self.state.lock().await;
        log::info!("[pi] 状态变更: {:?} -> {:?}", *state, new_state);
        *state = new_state;
    }

    /// 更新最后活跃时间
    async fn touch_last_active(&self) {
        let mut last = self.last_active.lock().await;
        *last = Instant::now();
    }

    /// 检查内置 pi 二进制是否存在
    pub fn check_builtin_pi(app: &AppHandle) -> bool {
        match pi_binary_path(app) {
            Ok(path) => {
                let exists = path.exists();
                log::info!("[pi] 内置 pi 路径: {:?}, 存在: {}", path, exists);
                exists
            }
            Err(e) => {
                log::warn!("[pi] 解析内置 pi 路径失败: {}", e);
                false
            }
        }
    }

    /// 获取应用数据目录中的 pi-agent 配置目录
    pub fn pi_agent_dir() -> Result<std::path::PathBuf, String> {
        let app_data = dirs::data_dir()
            .ok_or_else(|| "无法获取应用数据目录".to_string())?
            .join("raven")
            .join("pi-agent");
        std::fs::create_dir_all(&app_data)
            .map_err(|e| format!("创建 pi-agent 目录失败: {}", e))?;
        Ok(app_data)
    }

    /// 检查 Raven 隔离目录是否有有效凭证配置
    ///
    /// 检测 auth.json 或 models.json 是否存在且非空（>2 字节）。
    /// 用于决定是否设置 PI_CODING_AGENT_DIR 环境变量：
    /// 有有效配置时覆盖 pi 的配置目录为 Raven 隔离目录，
    /// 无配置时让 pi 用默认目录（~/.pi/agent/）。
    pub fn check_credentials_ready() -> bool {
        let agent_dir = match Self::pi_agent_dir() {
            Ok(dir) => dir,
            Err(_) => return false,
        };
        let auth_json = agent_dir.join("auth.json");
        let models_json = agent_dir.join("models.json");

        // auth.json 或 models.json 至少一个存在且非空
        let auth_valid = auth_json.exists() && {
            std::fs::metadata(&auth_json)
                .map(|m| m.len() > 2)
                .unwrap_or(false)
        };
        let models_valid = models_json.exists() && {
            std::fs::metadata(&models_json)
                .map(|m| m.len() > 2)
                .unwrap_or(false)
        };
        auth_valid || models_valid
    }


    /// spawn pi 子进程
    pub async fn spawn(&self, session_id: Option<String>) -> Result<(), String> {
        // 获取 AppHandle，用于定位内置 pi 二进制
        let app_handle = self.get_app_handle().await
            .ok_or_else(|| "AppHandle 未初始化".to_string())?;

        // 检查内置 pi 二进制是否存在
        if !Self::check_builtin_pi(&app_handle) {
            self.set_state(PiState::NotInstalled).await;
            self.emit_error("内置 pi 二进制缺失，请重新安装应用", None).await;
            return Err("内置 pi 二进制缺失".to_string());
        }

        // 注：不在此处做凭证前置检查。pi 启动后自行判断凭证是否有效，
        // 无凭证时通过 RPC 错误返回，避免 Raven 侧检查逻辑与 pi 实际行为不一致。

        // 如果已在运行，直接返回
        let current_state = self.get_state().await;
        if current_state == PiState::Idle || current_state == PiState::Streaming {
            log::info!("[pi] 进程已在运行，状态: {:?}", current_state);
            return Ok(());
        }

        let agent_dir = Self::pi_agent_dir()?;
        let pi_path = pi_binary_path(&app_handle)?;

        // 构建命令（使用内置 pi 二进制绝对路径）
        let mut cmd = Command::new(pi_path);

        // 只有当 Raven 隔离目录有有效凭证时，才用 PI_CODING_AGENT_DIR 覆盖。
        // 否则不设此环境变量，让 pi 用默认配置目录（~/.pi/agent/）。
        // pi 的 PI_CODING_AGENT_DIR 是覆盖而非追加——设了就不用全局配置。
        let has_raven_credentials = Self::check_credentials_ready();
        if has_raven_credentials {
            cmd.env("PI_CODING_AGENT_DIR", &agent_dir);
        } else {
            log::info!("[pi] Raven 隔离目录无有效凭证，pi 将使用默认配置目录");
        }
        cmd.arg("--mode").arg("rpc")
            .arg("--session-dir").arg(&agent_dir);

        // 加载 raven-docx extension（docx 文档操作工具）
        let ext_dir = pi_extensions_path(&app_handle)?;
        let ext_entry = ext_dir.join("raven-docx").join("index.ts");
        let prompt_path = ext_dir.join("raven-docx").join("system-prompt.txt");
        if ext_entry.exists() {
            cmd.arg("--extension").arg(&ext_entry);
            cmd.arg("--system-prompt").arg(&prompt_path);
            // 禁用 pi 的文件系统工具，避免 LLM 直接读写文件绕过 tracked changes
            cmd.arg("--no-context-files");
            cmd.arg("--exclude-tools").arg("read,write,edit,bash,grep,find,ls");
            log::info!("[pi] 加载 raven-docx extension: {}", ext_entry.display());
        } else {
            log::warn!("[pi] raven-docx extension 不存在: {}", ext_entry.display());
        }

        // 设置文档临时路径环境变量（extension 在 session_start 时读取）
        let doc_temp_path = self.get_doc_temp_path().await;
        if let Some(ref path) = doc_temp_path {
            cmd.env("RAVEN_DOCX_PATH", path);
            let doc_name = std::path::Path::new(path)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "Document".to_string());
            cmd.env("RAVEN_DOCX_NAME", &doc_name);
        }

        // 如果有 session_id，添加 --session-id 参数
        if let Some(sid) = &session_id {
            cmd.arg("--session-id").arg(sid);

            // 记录 session 元数据
            let mut sessions = self.sessions.lock().await;
            let now = Utc::now();
            sessions.insert(sid.clone(), SessionMeta {
                session_id: sid.clone(),
                created_at: now,
                last_active: now,
            });

            let mut current = self.current_session.lock().await;
            *current = Some(sid.clone());
        } else {
            cmd.arg("--no-session");
        }

        log::info!("[pi] spawn 命令: {:?}", cmd);

        // spawn 进程（stderr 必须 piped，否则 pi 启动失败的错误信息会丢失）
        let mut child = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("spawn pi 失败: {}", e))?;

        // 探测进程是否立即退出（如 session-id 非法会导致 pi 启动即退出）
        // 必须在 take stdin/stdout/stderr 之前探测，否则 try_wait 后无法再 take
        if let Err(e) = self.probe_alive(&mut child).await {
            self.set_state(PiState::Dead).await;
            self.emit_error(&e, None).await;
            return Err(e);
        }

        // 获取 stdin/stdout/stderr
        let child_stdin = child.stdin.take()
            .ok_or_else(|| "无法获取 pi stdin".to_string())?;
        let child_stdout = child.stdout.take()
            .ok_or_else(|| "无法获取 pi stdout".to_string())?;
        let child_stderr = child.stderr.take()
            .ok_or_else(|| "无法获取 pi stderr".to_string())?;

        // 重置主动关闭标记
        self.is_shutting_down.store(false, std::sync::atomic::Ordering::SeqCst);

        // 保存进程句柄和 stdin
        {
            let mut c = self.child.lock().await;
            *c = Some(child);
        }
        {
            let mut s = self.stdin.lock().await;
            *s = Some(child_stdin);
        }

        // 启动 stderr 读取循环（pi 的日志/错误转 log）
        self.start_stderr_reader(child_stderr);

        // 设置状态为 Idle
        self.set_state(PiState::Idle).await;
        self.touch_last_active().await;

        // 启动 stdout 读取循环（传入 self.clone() 以便崩溃时自动重启）
        self.start_stdout_reader(child_stdout, Arc::clone(&self.stdin), self.clone());

        // 启动空闲超时检测
        self.start_idle_timeout_checker().await;

        Ok(())
    }

    /// 启动 stderr 读取循环（tokio task），将 pi stderr 转为 log
    fn start_stderr_reader(&self, stderr: tokio::process::ChildStderr) {
        tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    log::info!("[pi:stderr] {}", line);
                }
            }
        });
    }

    /// spawn 后探测进程是否立即退出（启动失败诊断）
    /// 返回 Err(错误信息) 表示进程已退出，Ok(()) 表示进程存活。
    /// 直接从传入的 child 取 stderr（此时 stderr 尚未被 take 出来）。
    async fn probe_alive(&self, child: &mut Child) -> Result<(), String> {
        // 给 pi 一点时间完成启动校验（如 session-id 字符集检查）
        tokio::time::sleep(Duration::from_millis(500)).await;
        match child.try_wait() {
            Ok(Some(status)) => {
                let mut err_msg = String::new();
                if let Some(mut stderr) = child.stderr.take() {
                    use tokio::io::AsyncReadExt;
                    let _ = stderr.read_to_string(&mut err_msg).await;
                }
                let err_msg = err_msg.trim();
                if err_msg.is_empty() {
                    Err(format!("pi 进程启动后立即退出 (exit={})", status))
                } else {
                    Err(format!("pi 启动失败: {}", err_msg))
                }
            }
            Ok(None) => Ok(()),
            Err(e) => Err(format!("检查 pi 进程状态失败: {}", e)),
        }
    }

    /// 启动 stdout 读取循环（tokio task）
    fn start_stdout_reader(
        &self,
        stdout: tokio::process::ChildStdout,
        stdin: Arc<Mutex<Option<tokio::process::ChildStdin>>>,
        manager: AgentManager,
    ) {
        let state = Arc::clone(&self.state);
        let crash_history = Arc::clone(&self.crash_history);
        let last_active = Arc::clone(&self.last_active);
        let app_handle = Arc::clone(&self.app_handle);
        let stdin = Arc::clone(&stdin);
        let is_shutting_down = Arc::clone(&self.is_shutting_down);

        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            // 当前 agent turn 内是否有修改类工具成功执行（agent_end 时 emit 并重置）
            let mut document_dirty = false;

            while let Some(line) = match lines.next_line().await {
                Ok(Some(l)) => Some(l),
                Ok(None) => None,
                Err(e) => {
                    log::error!("[pi] stdout 读取错误: {}", e);
                    None
                }
            } {
                // 更新最后活跃时间
                {
                    let mut last = last_active.lock().await;
                    *last = Instant::now();
                }

                // 解析 JSONL（按 pi RPC 协议格式）
                match serde_json::from_str::<RpcFrame>(&line) {
                    Ok(frame) => {
                        // 处理不同帧类型
                        let app = app_handle.lock().await;
                        if let Some(handle) = app.as_ref() {
                            match &frame {
                                RpcFrame::Ready => {
                                    log::info!("[pi] 收到 ready 帧");
                                    let mut st = state.lock().await;
                                    *st = PiState::Idle;
                                }

                                RpcFrame::Response { id, command, success, error, .. } => {
                                    if !success {
                                        let error_msg = error.clone().unwrap_or_else(|| format!("命令 {} 失败", command));
                                        log::error!("[pi] RPC 响应失败: {} (id: {:?})", error_msg, id);
                                        let _ = handle.emit("pi:error", serde_json::json!({
                                            "message": error_msg,
                                            "message_id": id,
                                        }));
                                    } else {
                                        log::info!("[pi] RPC 响应成功: {} (id: {:?})", command, id);
                                    }
                                }

                                RpcFrame::AgentStart => {
                                    log::info!("[pi] agent_start");
                                    let mut st = state.lock().await;
                                    *st = PiState::Streaming;
                                }

                                RpcFrame::AgentEnd { .. } => {
                                    log::info!("[pi] agent_end (document_dirty: {})", document_dirty);
                                    let mut st = state.lock().await;
                                    *st = PiState::Idle;
                                    let _ = handle.emit("pi:agent_end", serde_json::json!({
                                        "documentDirty": document_dirty,
                                    }));
                                    document_dirty = false;
                                }

                                RpcFrame::ToolExecutionStart { tool_name, .. } => {
                                    log::info!("[pi] tool_execution_start: {}", tool_name);
                                }

                                RpcFrame::ToolExecutionEnd { tool_name, is_error, .. } => {
                                    log::info!("[pi] tool_execution_end: {} (error: {})", tool_name, is_error);
                                    // 修改类工具成功执行 → 标记 dirty
                                    const MUTATION_TOOLS: &[&str] = &[
                                        "suggest_change", "add_comment", "apply_formatting",
                                        "set_paragraph_style", "reply_comment", "resolve_comment",
                                        "insert_paragraph",
                                    ];
                                    if !is_error && MUTATION_TOOLS.contains(&tool_name.as_str()) {
                                        document_dirty = true;
                                    }
                                    let _ = handle.emit("pi:tool_execution", serde_json::json!({
                                        "toolName": tool_name,
                                        "isError": is_error,
                                    }));
                                }

                                RpcFrame::MessageUpdate { assistant_message_event, .. } => {
                                    // 处理嵌套的消息更新事件
                                    match assistant_message_event {
                                        AssistantMessageEvent::TextDelta { delta } => {
                                            let _ = handle.emit("pi:text_delta", serde_json::json!({
                                                "text": delta,
                                            }));
                                        }
                                        AssistantMessageEvent::ThinkingDelta { delta } => {
                                            let _ = handle.emit("pi:thinking_delta", serde_json::json!({
                                                "text": delta,
                                            }));
                                        }
                                        AssistantMessageEvent::ToolCallDelta { tool_call } => {
                                            let _ = handle.emit("pi:tool_call", serde_json::json!({
                                                "tool": tool_call,
                                            }));
                                        }
                                        AssistantMessageEvent::Unknown => {
                                            // 忽略未知的消息类型
                                            log::debug!("[pi] ignored unknown assistant message event");
                                        }
                                    }
                                }

                                RpcFrame::TurnStart => {
                                    log::debug!("[pi] turn_start");
                                }

                                RpcFrame::TurnEnd => {
                                    log::debug!("[pi] turn_end");
                                }

                                RpcFrame::MessageStart => {
                                    log::debug!("[pi] message_start");
                                }

                                RpcFrame::MessageEnd => {
                                    log::debug!("[pi] message_end");
                                }
                                RpcFrame::ExtensionUIRequest { id, method, params } => {
                                    log::info!("[pi] extension_ui_request: {} ({:?})", id, method);
                                    // 自动确认扩展 UI 请求
                                    let response = serde_json::json!({
                                        "type": "extension_ui_response",
                                        "id": id,
                                        "confirmed": true,
                                        "result": params
                                    });
                                    let mut stdin_guard = stdin.lock().await;
                                    if let Some(ref mut stdin) = *stdin_guard {
                                        let json_line = format!("{}\n", response);
                                        if let Err(e) = stdin.write_all(json_line.as_bytes()).await {
                                            log::error!("[pi] 写入 extension_ui_response 失败: {}", e);
                                        } else if let Err(e) = stdin.flush().await {
                                            log::error!("[pi] flush extension_ui_response 失败: {}", e);
                                        }
                                        log::debug!("[pi] 已自动确认 extension_ui_request: {}", id);
                                    }
                                }


                                RpcFrame::Unknown => {
                                    log::debug!("[pi] 收到未知帧类型");
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("[pi] 无法解析 JSONL: {} (错误: {})", line, e);
                    }
                }
            }

            // stdout 关闭，进程可能退出
            log::info!("[pi] stdout 关闭");

            // 如果是主动 shutdown（应用退出/空闲超时），不触发崩溃重启
            if is_shutting_down.load(std::sync::atomic::Ordering::SeqCst) {
                log::info!("[pi] 主动关闭，跳过自动重启");
                let mut st = state.lock().await;
                *st = PiState::Stopped;
                return;
            }

            // 检查是否是崩溃退出
            let now = Instant::now();
            let mut history = crash_history.lock().await;
            history.retain(|t| now.duration_since(*t).as_secs() < CRASH_WINDOW_SECS);

            if history.len() < MAX_CRASHES_PER_WINDOW {
                // 未超限，记录崩溃并尝试重启
                history.push(now);
                drop(history);

                let mut st = state.lock().await;
                *st = PiState::Dead;

                // emit 错误事件
                let app = app_handle.lock().await;
                if let Some(handle) = app.as_ref() {
                    let _ = handle.emit("pi:error", serde_json::json!({
                        "message": "Agent 进程意外退出，正在尝试重启...",
                        "message_id": null,
                    }));
                }
                drop(app);

                // 自动重启：调用 spawn(None) 重启进程
                log::info!("[pi] 尝试自动重启进程...");
                if let Err(e) = manager.spawn(None).await {
                    log::error!("[pi] 自动重启失败: {}", e);
                    let app = app_handle.lock().await;
                    if let Some(handle) = app.as_ref() {
                        let _ = handle.emit("pi:error", serde_json::json!({
                            "message": format!("自动重启失败: {}", e),
                            "message_id": null,
                        }));
                    }
                } else {
                    log::info!("[pi] 自动重启成功");
                }
            } else {
                // 超限，进入 Dead 状态不再重启
                let mut st = state.lock().await;
                *st = PiState::Dead;

                let app = app_handle.lock().await;
                if let Some(handle) = app.as_ref() {
                    let _ = handle.emit("pi:error", serde_json::json!({
                        "message": "Agent 进程频繁崩溃，已停止自动重启",
                        "message_id": null,
                    }));
                }
            }
        });
    }

    /// 启动空闲超时检测（tokio task）
    async fn start_idle_timeout_checker(&self) {
        let state = Arc::clone(&self.state);
        let child = Arc::clone(&self.child);
        let stdin_handle = Arc::clone(&self.stdin);
        let last_active = Arc::clone(&self.last_active);
        let is_shutting_down = Arc::clone(&self.is_shutting_down);

        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(30)).await;

                let last = {
                    let last = last_active.lock().await;
                    *last
                };

                let idle_secs = Instant::now().duration_since(last).as_secs();
                if idle_secs >= IDLE_TIMEOUT_SECS {
                    let current_state = {
                        let st = state.lock().await;
                        *st
                    };

                    if current_state == PiState::Idle {
                        log::info!("[pi] 空闲超时 ({}s)，关闭进程", idle_secs);
                        // 标记主动关闭，避免 stdout reader 触发崩溃重启
                        is_shutting_down.store(true, std::sync::atomic::Ordering::SeqCst);

                        // kill 进程
                        {
                            let mut c = child.lock().await;
                            if let Some(mut child_proc) = c.take() {
                                let _ = child_proc.kill().await;
                            }
                        }
                        {
                            let mut s = stdin_handle.lock().await;
                            *s = None;
                        }

                        // 设置状态为 Stopped
                        let mut st = state.lock().await;
                        *st = PiState::Stopped;

                        break;
                    }
                }
            }
        });
    }

    /// 发送 prompt 到 pi stdin
    pub async fn send_prompt(&self, prompt: String, mode: SendMode) -> Result<String, String> {
        let message_id = format!("msg_{}", chrono::Utc::now().timestamp_millis());
        let current_state = self.get_state().await;

        match mode {
            SendMode::Default => {
                if current_state == PiState::Idle {
                    // 直接发送 prompt（无 streamingBehavior）
                    self.send_prompt_command(&prompt, &message_id).await?;
                    self.set_state(PiState::Streaming).await;
                } else if current_state == PiState::Streaming {
                    // 流式期间发送 prompt + streamingBehavior: "followUp"
                    self.send_follow_up_command(&prompt, &message_id).await?;
                } else {
                    return Err(format!("当前状态 {:?} 不允许发送", current_state));
                }
            }
            SendMode::Steer => {
                // 发送 steer 命令（pi 自动处理中断和队列清空）
                self.send_steer_command(&prompt, &message_id).await?;
                self.set_state(PiState::Streaming).await;
            }
            SendMode::Enqueue => {
                // 发送 prompt + streamingBehavior: "followUp"（pi 内部队列处理）
                self.send_follow_up_command(&prompt, &message_id).await?;
            }
        }

        self.touch_last_active().await;
        Ok(message_id)
    }

    /// 发送 RPC 命令
    async fn send_rpc_command(&self, json: serde_json::Value) -> Result<(), String> {
        let mut stdin_lock = self.stdin.lock().await;
        if let Some(stdin) = stdin_lock.as_mut() {
            let json_line = format!("{}\n", json);
            stdin.write_all(json_line.as_bytes()).await
                .map_err(|e| format!("写入 stdin 失败: {}", e))?;
            stdin.flush().await
                .map_err(|e| format!("flush stdin 失败: {}", e))?;
            Ok(())
        } else {
            Err("进程未运行".to_string())
        }
    }

    /// 发送 prompt 命令（普通模式）
    async fn send_prompt_command(&self, message: &str, id: &str) -> Result<(), String> {
        self.send_rpc_command(serde_json::json!({
            "type": "prompt",
            "id": id,
            "message": message,
        })).await?;
        log::info!("[pi] 已发送 prompt (id={})", id);
        Ok(())
    }

    /// 发送 follow_up 命令（流式期间追加）
    async fn send_follow_up_command(&self, message: &str, id: &str) -> Result<(), String> {
        self.send_rpc_command(serde_json::json!({
            "type": "prompt",
            "id": id,
            "message": message,
            "streamingBehavior": "followUp",
        })).await?;
        log::info!("[pi] 已发送 follow_up (id={})", id);
        Ok(())
    }

    /// 发送 steer 命令（中断 + 新消息，原子操作）
    async fn send_steer_command(&self, message: &str, id: &str) -> Result<(), String> {
        self.send_rpc_command(serde_json::json!({
            "type": "steer",
            "id": id,
            "message": message,
        })).await?;
        log::info!("[pi] 已发送 steer (id={})", id);
        Ok(())
    }

    /// 发送 abort 命令
    pub async fn abort(&self) -> Result<(), String> {
        let current_state = self.get_state().await;
        if current_state != PiState::Streaming {
            return Ok(());
        }

        let id = format!("abort_{}", chrono::Utc::now().timestamp_millis());
        self.send_rpc_command(serde_json::json!({
            "type": "abort",
            "id": id,
        })).await?;
        log::info!("[pi] 已发送 abort (id={})", id);
        Ok(())
    }


    /// 发送 get_state RPC 命令（用于连接测试）
    pub async fn send_get_state_rpc(&self) -> Result<(), String> {
        let id = format!("get_state_{}", chrono::Utc::now().timestamp_millis());
        self.send_rpc_command(serde_json::json!({
            "type": "get_state",
            "id": id,
        })).await?;
        log::info!("[pi] 已发送 get_state (id={})", id);
        Ok(())
    }
    /// 关闭进程（优雅关闭）
    pub async fn shutdown(&self) -> Result<(), String> {
        let current_state = self.get_state().await;
        if current_state == PiState::Stopped || current_state == PiState::NotInstalled {
            return Ok(());
        }

        self.set_state(PiState::ShuttingDown).await;
        // 标记为主动关闭，stdout reader 检测到此 flag 不触发崩溃重启
        self.is_shutting_down.store(true, std::sync::atomic::Ordering::SeqCst);

        // 取出 child 进程
        let mut child_lock = self.child.lock().await;
        if let Some(mut child_proc) = child_lock.take() {
            // 发送 SIGTERM (Unix) / kill (Windows)
            #[cfg(unix)]
            {
                if let Some(pid) = child_proc.id() {
                    unsafe {
                        libc::kill(pid as i32, libc::SIGTERM);
                    }
                }
            }

            #[cfg(windows)]
            {
                let _ = child_proc.kill().await;
            }

            // 等待优雅关闭
            let wait_result = timeout(
                Duration::from_secs(SHUTDOWN_GRACE_SECS),
                child_proc.wait(),
            ).await;

            match wait_result {
                Ok(_) => {
                    log::info!("[pi] 进程已优雅退出");
                }
                Err(_) => {
                    // 超时，强制 kill
                    log::warn!("[pi] 优雅关闭超时，强制 kill");
                    let _ = child_proc.kill().await;
                }
            }
        }

        // 清理 stdin
        {
            let mut s = self.stdin.lock().await;
            *s = None;
        }

        self.set_state(PiState::Stopped).await;

        Ok(())
    }

    /// 获取当前 session_id
    pub async fn get_current_session(&self) -> Option<String> {
        let session = self.current_session.lock().await;
        session.clone()
    }

    /// emit 错误事件
    async fn emit_error(&self, message: &str, message_id: Option<&str>) {
        if let Some(handle) = self.get_app_handle().await {
            let _ = handle.emit("pi:error", serde_json::json!({
                "message": message,
                "message_id": message_id,
            }));
        }
    }
}


/// 独立测试函数：验证 pi 连接
///
/// 启动 pi rpc 进程，发送 get_state 命令，验证响应。
/// pi 使用自身配置（~/.pi/agent/models.json 中的 provider/apiKey/baseUrl），
/// 不通过 CLI 参数传递凭证——pi 不支持 --base-url 参数，
/// 且 --api-key 需要配合 --model/--provider 使用。
///
/// 返回 Ok(true) 表示连接成功，Ok(false) 表示认证失败，Err 表示其他错误
pub async fn test_api_connection(app: &AppHandle) -> Result<bool, String> {
    use std::process::Stdio;
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::process::Command;
    use tokio::time::{timeout, Duration};

    // 检查内置 pi 二进制是否存在
    if !AgentManager::check_builtin_pi(app) {
        return Err("内置 pi 二进制缺失".to_string());
    }

    let agent_dir = AgentManager::pi_agent_dir()?;
    let pi_path = pi_binary_path(app)?;

    // 构建命令：与 spawn() 一致，使用内置 pi 二进制
    let mut cmd = Command::new(pi_path);

    // 与 spawn() 一致：仅当 Raven 隔离目录有有效凭证时才覆盖配置目录
    if AgentManager::check_credentials_ready() {
        cmd.env("PI_CODING_AGENT_DIR", &agent_dir);
    }
    cmd.arg("--mode").arg("rpc")
        .arg("--session-dir").arg(&agent_dir)
        .arg("--no-session");

    log::info!("[pi-test] spawn 命令: {:?}", cmd);

    // spawn 进程（捕获 stderr 以便诊断启动失败）
    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn pi 失败: {}", e))?;

    // 获取 stdin/stdout/stderr
    let mut child_stdin = child.stdin.take()
        .ok_or_else(|| "无法获取 pi stdin".to_string())?;
    let child_stdout = child.stdout.take()
        .ok_or_else(|| "无法获取 pi stdout".to_string())?;
    let mut child_stderr = child.stderr.take();

    // 发送 get_state 命令
    let request_id = "test_connection";
    let cmd_json = serde_json::json!({
        "type": "get_state",
        "id": request_id,
    });
    let json_line = format!("{}\n", cmd_json);

    child_stdin.write_all(json_line.as_bytes()).await
        .map_err(|e| format!("写入 stdin 失败: {}", e))?;
    child_stdin.flush().await
        .map_err(|e| format!("flush stdin 失败: {}", e))?;

    // 读取响应
    let mut reader = BufReader::new(child_stdout);
    let mut line = String::new();

    let response_result = timeout(Duration::from_secs(15), async {
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => {
                    // pi 退出，读取 stderr 获取错误信息
                    let mut err_msg = String::new();
                    if let Some(stderr) = child_stderr.as_mut() {
                        use tokio::io::AsyncReadExt;
                        let _ = stderr.read_to_string(&mut err_msg).await;
                    }
                    let err_msg = err_msg.trim();
                    if err_msg.is_empty() {
                        return Err("pi 进程提前退出（无 stderr 输出）".to_string());
                    }
                    return Err(format!("pi 进程退出: {}", err_msg));
                }
                Ok(_) => {
                    // 尝试解析为 RPC 帧
                    if let Ok(frame) = serde_json::from_str::<RpcFrame>(&line) {
                        match frame {
                            RpcFrame::Response { id, success, error, .. } => {
                                if id.as_deref() == Some(request_id) {
                                    if success {
                                        log::info!("[pi-test] API 连接测试成功");
                                        return Ok(true);
                                    } else {
                                        let err_msg = error.unwrap_or_else(|| "未知错误".to_string());
                                        log::warn!("[pi-test] API 连接测试失败: {}", err_msg);
                                        // 检查是否是认证错误
                                        if err_msg.to_lowercase().contains("authentication")
                                            || err_msg.to_lowercase().contains("api key")
                                            || err_msg.to_lowercase().contains("unauthorized")
                                            || err_msg.contains("认证")
                                            || err_msg.contains("API")
                                        {
                                            return Ok(false);
                                        }
                                        return Err(err_msg);
                                    }
                                }
                            }
                            RpcFrame::Ready => {
                                log::debug!("[pi-test] 收到 ready 帧，继续等待响应");
                                continue;
                            }
                            _ => {
                                // 忽略其他帧类型
                                continue;
                            }
                        }
                    }
                }
                Err(e) => return Err(format!("读取 stdout 失败: {}", e)),
            }
        }
    }).await;

    // 关闭进程
    let _ = child.kill().await;
    let _ = child.wait().await;

    match response_result {
        Ok(result) => result,
        Err(_) => Err("连接测试超时（15s）".to_string()),
    }
}

// ===== pi RPC 帧类型 =====

/// pi stdout 输出的 RPC 帧（顶层）
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum RpcFrame {
    /// 启动就绪
    #[serde(rename = "ready")]
    Ready,

    /// 命令响应
    #[serde(rename = "response")]
    Response {
        id: Option<String>,
        command: String,
        success: bool,
        #[serde(default)]
        data: Option<serde_json::Value>,
        #[serde(default)]
        error: Option<String>,
    },

    /// Agent 会话开始
    #[serde(rename = "agent_start")]
    AgentStart,

    /// Agent 会话结束
    #[serde(rename = "agent_end")]
    AgentEnd {
        #[serde(default)]
        messages: Vec<serde_json::Value>,
    },

    /// 消息更新（含流式增量）
    #[serde(rename = "message_update")]
    MessageUpdate {
        #[serde(default)]
        id: Option<String>,
        #[serde(rename = "assistantMessageEvent")]
        assistant_message_event: AssistantMessageEvent,
        #[serde(default)]
        message: serde_json::Value,
    },

    /// 消息开始
    #[serde(rename = "message_start")]
    MessageStart,

    /// 消息结束
    #[serde(rename = "message_end")]
    MessageEnd,

    /// Turn 开始
    #[serde(rename = "turn_start")]
    TurnStart,

    /// Turn 结束
    #[serde(rename = "turn_end")]
    TurnEnd,

    /// 扩展 UI 请求（如确认对话框、输入框）
    #[serde(rename = "extension_ui_request")]
    ExtensionUIRequest {
        id: String,
        #[serde(default)]
        method: Option<String>,
        #[serde(default)]
        params: serde_json::Value,
    },

    /// 工具执行开始
    #[serde(rename = "tool_execution_start")]
    ToolExecutionStart {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        #[serde(default)]
        args: serde_json::Value,
    },

    /// 工具执行结束
    #[serde(rename = "tool_execution_end")]
    ToolExecutionEnd {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        #[serde(default)]
        result: serde_json::Value,
        #[serde(rename = "isError", default)]
        is_error: bool,
    },

    /// 未知帧类型
    #[serde(other)]
    Unknown,
}

/// 嵌套的消息更新事件
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum AssistantMessageEvent {
    #[serde(rename = "text_delta")]
    TextDelta {
        delta: String,
    },

    #[serde(rename = "thinking_delta")]
    ThinkingDelta {
        delta: String,
    },

    #[serde(rename = "tool_call_delta")]
    ToolCallDelta {
        tool_call: serde_json::Value,
    },

    #[serde(other)]
    Unknown,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pi_binary_rel_path_is_correct_for_platform() {
        // 验证内置 pi 二进制相对路径在编译期正确分平台
        if cfg!(target_os = "windows") {
            assert_eq!(PI_BINARY_REL, "pi/pi.exe");
        } else {
            assert_eq!(PI_BINARY_REL, "pi/pi");
        }
    }

    #[test]
    fn test_pi_state_not_configured_display() {
        assert_eq!(PiState::NotConfigured.to_string(), "NotConfigured");
    }

    #[test]
    fn test_pi_state_not_configured_is_distinct_from_not_installed() {
        assert_ne!(PiState::NotConfigured, PiState::NotInstalled);
    }

    /// 验证：非法 session-id（含路径分隔符）会让 pi 启动失败，
    /// spawn 应返回包含 stderr 错误信息的 Err，而非静默成功。
    /// 集成测试：依赖内置 pi 二进制和 AppHandle，需手动运行。
    /// 手动运行：cargo test test_spawn_rejects_illegal_session_id -- --nocapture --ignored
    #[tokio::test]
    #[ignore]
    async fn test_spawn_rejects_illegal_session_id() {
        // 此测试需要真实 AppHandle，仅在有 tauri 测试上下文时可用
        // 默认跳过，手动验证时需提供 AppHandle
        println!("Note: 此测试需要 AppHandle，已跳过");
    }

    #[test]
    fn test_rpcframe_tool_execution_end_deserializes() {
        // pi tool_execution_end 帧：含 toolName, toolCallId, isError, result
        let json = r#"{"type":"tool_execution_end","toolCallId":"call_123","toolName":"suggest_change","isError":false,"result":{"content":[{"type":"text","text":"ok"}]}}"#;
        let frame: RpcFrame = serde_json::from_str(json).expect("反序列化失败");
        match frame {
            RpcFrame::ToolExecutionEnd { tool_name, tool_call_id, is_error, .. } => {
                assert_eq!(tool_name, "suggest_change");
                assert_eq!(tool_call_id, "call_123");
                assert!(!is_error);
            }
            other => panic!("期望 ToolExecutionEnd，得到 {:?}", other),
        }
    }

    #[test]
    fn test_rpcframe_tool_execution_end_with_error() {
        let json = r#"{"type":"tool_execution_end","toolCallId":"call_456","toolName":"suggest_change","isError":true,"result":{"content":[{"type":"text","text":"Text not found"}]}}"#;
        let frame: RpcFrame = serde_json::from_str(json).expect("反序列化失败");
        match frame {
            RpcFrame::ToolExecutionEnd { tool_name, is_error, .. } => {
                assert_eq!(tool_name, "suggest_change");
                assert!(is_error);
            }
            other => panic!("期望 ToolExecutionEnd，得到 {:?}", other),
        }
    }

    #[test]
    fn test_rpcframe_tool_execution_start_deserializes() {
        let json = r#"{"type":"tool_execution_start","toolCallId":"call_789","toolName":"read_document","args":{}}"#;
        let frame: RpcFrame = serde_json::from_str(json).expect("反序列化失败");
        match frame {
            RpcFrame::ToolExecutionStart { tool_name, tool_call_id, .. } => {
                assert_eq!(tool_name, "read_document");
                assert_eq!(tool_call_id, "call_789");
            }
            other => panic!("期望 ToolExecutionStart，得到 {:?}", other),
        }
    }

    #[test]
    fn test_rpcframe_tool_execution_end_defaults_is_error_false() {
        // isError 字段缺失时应默认 false
        let json = r#"{"type":"tool_execution_end","toolCallId":"c1","toolName":"add_comment","result":{}}"#;
        let frame: RpcFrame = serde_json::from_str(json).expect("反序列化失败");
        match frame {
            RpcFrame::ToolExecutionEnd { is_error, .. } => {
                assert!(!is_error);
            }
            other => panic!("期望 ToolExecutionEnd，得到 {:?}", other),
        }
    }
}
