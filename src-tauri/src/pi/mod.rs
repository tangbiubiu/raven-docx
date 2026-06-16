// pi/mod.rs — pi agent 子进程管理核心
// 负责 spawn/kill pi 进程、stdin/stdout JSONL 通信、状态机、消息队列、崩溃恢复、空闲超时

use std::collections::{HashMap, VecDeque};
use std::process::Stdio;
use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
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

/// pi 二进制名称
const PI_BINARY: &str = "pi";

// ===== 状态机 =====

/// pi agent 进程状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum PiState {
    /// pi 二进制未找到
    NotInstalled,
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
            PiState::Stopped => write!(f, "Stopped"),
            PiState::Idle => write!(f, "Idle"),
            PiState::Streaming => write!(f, "Streaming"),
            PiState::Dead => write!(f, "Dead"),
            PiState::ShuttingDown => write!(f, "ShuttingDown"),
        }
    }
}

// ===== 消息队列 =====

/// 发送模式
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SendMode {
    /// 默认：Idle 直接发送，Streaming 入队（follow_up）
    Default,
    /// 中断：abort 当前 + 清空队列 + 立即发送
    Steer,
    /// 强制入队：无论状态都入队
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

/// 队列中的待发送消息
#[derive(Debug, Clone)]
struct QueuedMessage {
    prompt: String,
    mode: SendMode,
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
    /// 消息队列
    pending: Arc<Mutex<VecDeque<QueuedMessage>>>,
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
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(PiState::Stopped)),
            child: Arc::new(Mutex::new(None)),
            stdin: Arc::new(Mutex::new(None)),
            pending: Arc::new(Mutex::new(VecDeque::new())),
            crash_history: Arc::new(Mutex::new(Vec::new())),
            last_active: Arc::new(Mutex::new(Instant::now())),
            sessions: Arc::new(Mutex::new(HashMap::new())),
            current_session: Arc::new(Mutex::new(None)),
            app_handle: Arc::new(Mutex::new(None)),
        }
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

    /// 检查 pi 二进制是否存在
    pub fn check_pi_installed() -> bool {
        which::which(PI_BINARY).is_ok()
    }

    /// 获取应用数据目录中的 pi-agent 配置目录
    pub fn pi_agent_dir() -> Result<std::path::PathBuf, String> {
        let app_data = dirs::data_dir()
            .ok_or_else(|| "无法获取应用数据目录".to_string())?
            .join("geex-docx")
            .join("pi-agent");
        std::fs::create_dir_all(&app_data)
            .map_err(|e| format!("创建 pi-agent 目录失败: {}", e))?;
        Ok(app_data)
    }

    /// spawn pi 子进程
    pub async fn spawn(&self, session_id: Option<String>) -> Result<(), String> {
        // 检查是否已安装
        if !Self::check_pi_installed() {
            self.set_state(PiState::NotInstalled).await;
            self.emit_error("pi 未安装，请先安装 pi coding agent", None).await;
            return Err("pi 未安装".to_string());
        }

        // 如果已在运行，直接返回
        let current_state = self.get_state().await;
        if current_state == PiState::Idle || current_state == PiState::Streaming {
            log::info!("[pi] 进程已在运行，状态: {:?}", current_state);
            return Ok(());
        }

        let agent_dir = Self::pi_agent_dir()?;

        // 构建命令
        let mut cmd = Command::new(PI_BINARY);
        cmd.arg("--mode").arg("rpc")
            .arg("--agent-dir").arg(&agent_dir);

        // 如果有 session_id，添加 --session 参数
        if let Some(sid) = &session_id {
            cmd.arg("--session").arg(sid);

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
        }

        log::info!("[pi] spawn 命令: {:?}", cmd);

        // spawn 进程
        let mut child = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("spawn pi 失败: {}", e))?;

        // 获取 stdin/stdout
        let child_stdin = child.stdin.take()
            .ok_or_else(|| "无法获取 pi stdin".to_string())?;
        let child_stdout = child.stdout.take()
            .ok_or_else(|| "无法获取 pi stdout".to_string())?;

        // 保存进程句柄和 stdin
        {
            let mut c = self.child.lock().await;
            *c = Some(child);
        }
        {
            let mut s = self.stdin.lock().await;
            *s = Some(child_stdin);
        }

        // 设置状态为 Idle
        self.set_state(PiState::Idle).await;
        self.touch_last_active().await;

        // 启动 stdout 读取循环（传入 self.clone() 以便崩溃时自动重启）
        self.start_stdout_reader(child_stdout, Arc::clone(&self.stdin), self.clone());

        // 启动空闲超时检测
        self.start_idle_timeout_checker().await;

        Ok(())
    }

    /// 启动 stdout 读取循环（tokio task）
    fn start_stdout_reader(
        &self,
        stdout: tokio::process::ChildStdout,
        stdin: Arc<Mutex<Option<tokio::process::ChildStdin>>>,
        manager: AgentManager,
    ) {
        let state = Arc::clone(&self.state);
        let pending = Arc::clone(&self.pending);
        let crash_history = Arc::clone(&self.crash_history);
        let last_active = Arc::clone(&self.last_active);
        let app_handle = Arc::clone(&self.app_handle);
        let stdin_handle = stdin;

        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

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

                // 解析 JSONL
                match serde_json::from_str::<PiEvent>(&line) {
                    Ok(event) => {
                        // emit 到前端
                        let app = app_handle.lock().await;
                        if let Some(handle) = app.as_ref() {
                            match &event {
                                PiEvent::TextDelta { text, message_id } => {
                                    let _ = handle.emit("pi:text_delta", serde_json::json!({
                                        "text": text,
                                        "message_id": message_id,
                                    }));
                                }
                                PiEvent::ToolCall { name, args, message_id } => {
                                    let _ = handle.emit("pi:tool_call", serde_json::json!({
                                        "name": name,
                                        "args": args,
                                        "message_id": message_id,
                                    }));
                                }
                                PiEvent::AgentEnd { message_id } => {
                                    let _ = handle.emit("pi:agent_end", serde_json::json!({
                                        "message_id": message_id,
                                    }));

                                    // agent_end 后检查队列，自动发送下一条
                                    let mut st = state.lock().await;
                                    if *st == PiState::Streaming {
                                        let mut queue = pending.lock().await;
                                        if let Some(msg) = queue.pop_front() {
                                            log::info!("[pi] 队列出队，发送下一条消息");
                                            drop(st);
                                            drop(queue);

                                            let message_id = format!("msg_{}", chrono::Utc::now().timestamp_millis());
                                            let cmd = serde_json::json!({
                                                "command": "prompt",
                                                "text": msg.prompt,
                                                "message_id": message_id,
                                            });
                                            let json_line = format!("{}\n", cmd);

                                            let mut si = stdin_handle.lock().await;
                                            if let Some(writer) = si.as_mut() {
                                                if writer.write_all(json_line.as_bytes()).await.is_ok()
                                                    && writer.flush().await.is_ok()
                                                {
                                                    log::info!("[pi] 已自动发送队列消息 (message_id={})", message_id);
                                                    let mut st2 = state.lock().await;
                                                    *st2 = PiState::Streaming;
                                                } else {
                                                    log::error!("[pi] 写入 stdin 失败，队列消息已丢弃");
                                                    let mut st2 = state.lock().await;
                                                    *st2 = PiState::Idle;
                                                }
                                            } else {
                                                log::error!("[pi] stdin 不可用，队列消息已丢弃");
                                                let mut st2 = state.lock().await;
                                                *st2 = PiState::Idle;
                                            }
                                        } else {
                                            *st = PiState::Idle;
                                        }
                                    }
                                }
                                PiEvent::Error { message, message_id } => {
                                    let _ = handle.emit("pi:error", serde_json::json!({
                                        "message": message,
                                        "message_id": message_id,
                                    }));
                                }
                            }
                        }
                    }
                    Err(_) => {
                        log::warn!("[pi] 无法解析 JSONL: {}", line);
                    }
                }
            }

            // stdout 关闭，进程可能退出
            log::info!("[pi] stdout 关闭");

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
                    // 直接发送
                    self.write_to_stdin(&prompt, &message_id).await?;
                    self.set_state(PiState::Streaming).await;
                } else if current_state == PiState::Streaming {
                    // 入队
                    let mut queue = self.pending.lock().await;
                    queue.push_back(QueuedMessage { prompt, mode });
                    let position = queue.len() as u32;

                    // emit 排队通知
                    if let Some(handle) = self.get_app_handle().await {
                        let _ = handle.emit("pi:queued", serde_json::json!({
                            "position": position,
                        }));
                    }
                } else {
                    return Err(format!("当前状态 {:?} 不允许发送", current_state));
                }
            }
            SendMode::Steer => {
                // 中断当前 + 清空队列 + 立即发送
                self.abort().await?;

                let mut queue = self.pending.lock().await;
                queue.clear();
                drop(queue);

                self.write_to_stdin(&prompt, &message_id).await?;
                self.set_state(PiState::Streaming).await;
            }
            SendMode::Enqueue => {
                // 强制入队
                let mut queue = self.pending.lock().await;
                queue.push_back(QueuedMessage { prompt, mode });
                let position = queue.len() as u32;

                // emit 排队通知
                if let Some(handle) = self.get_app_handle().await {
                    let _ = handle.emit("pi:queued", serde_json::json!({
                        "position": position,
                    }));
                }
            }
        }

        self.touch_last_active().await;
        Ok(message_id)
    }

    /// 写入 stdin
    async fn write_to_stdin(&self, prompt: &str, message_id: &str) -> Result<(), String> {
        let mut stdin_lock = self.stdin.lock().await;
        if let Some(stdin) = stdin_lock.as_mut() {
            // 构建 JSON 命令
            let cmd = serde_json::json!({
                "command": "prompt",
                "text": prompt,
                "message_id": message_id,
            });

            let json_line = format!("{}\n", cmd);
            stdin.write_all(json_line.as_bytes()).await
                .map_err(|e| format!("写入 stdin 失败: {}", e))?;
            stdin.flush().await
                .map_err(|e| format!("flush stdin 失败: {}", e))?;

            log::info!("[pi] 已发送 prompt (message_id={})", message_id);
            Ok(())
        } else {
            Err("进程未运行".to_string())
        }
    }

    /// 中止当前操作
    pub async fn abort(&self) -> Result<(), String> {
        let current_state = self.get_state().await;
        if current_state != PiState::Streaming {
            return Ok(());
        }

        let mut stdin_lock = self.stdin.lock().await;
        if let Some(stdin) = stdin_lock.as_mut() {
            // 发送 abort 命令
            let cmd = serde_json::json!({
                "command": "abort",
            });

            let json_line = format!("{}\n", cmd);
            stdin.write_all(json_line.as_bytes()).await
                .map_err(|e| format!("写入 abort 失败: {}", e))?;
            stdin.flush().await
                .map_err(|e| format!("flush abort 失败: {}", e))?;

            log::info!("[pi] 已发送 abort");
        }

        Ok(())
    }

    /// 关闭进程（优雅关闭）
    pub async fn shutdown(&self) -> Result<(), String> {
        let current_state = self.get_state().await;
        if current_state == PiState::Stopped || current_state == PiState::NotInstalled {
            return Ok(());
        }

        self.set_state(PiState::ShuttingDown).await;

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

    /// 获取队列长度
    pub async fn get_pending_count(&self) -> u32 {
        let queue = self.pending.lock().await;
        queue.len() as u32
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

// ===== pi 事件类型 =====

/// pi stdout 输出的事件
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum PiEvent {
    #[serde(rename = "text_delta")]
    TextDelta {
        text: String,
        message_id: String,
    },
    #[serde(rename = "tool_call")]
    ToolCall {
        name: String,
        args: serde_json::Value,
        message_id: String,
    },
    #[serde(rename = "agent_end")]
    AgentEnd {
        message_id: String,
    },
    #[serde(rename = "error")]
    Error {
        message: String,
        message_id: Option<String>,
    },
}
