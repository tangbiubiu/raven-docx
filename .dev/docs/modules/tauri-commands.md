# Tauri Commands — 后端命令

> **目录**：`src-tauri/src/commands/`
> **协议**：所有命令 `#[tauri::command]` + `#[specta::specta]`，返回 `Result<T, String>`
> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**：草案

---

## 1. 文件清单

```
src-tauri/src/commands/
├── file.rs          # 文档文件 I/O
├── pi_agent.rs      # pi agent 子进程管理
└── system.rs        # 系统信息

src-tauri/src/
├── pi/
│   └── mod.rs       # pi 子进程 spawn/kill/通信 逻辑模块（被 commands/pi_agent.rs 调用）
├── commands.rs      → 已拆分为 commands/ 目录
├── lib.rs           # 注册 commands + 插件
└── main.rs          # 入口
```

`lib.rs` 更新：
```rust
mod commands;  // → mod commands 指向 commands/mod.rs
```

`src-tauri/src/commands/mod.rs`：
```rust
pub mod file;
pub mod pi_agent;
pub mod system;
```

注册：
```rust
// lib.rs
.commands(collect_commands![
    commands::file::open_docx,
    commands::file::save_docx,
    commands::file::save_as_docx,
    commands::file::get_recent_files,
    commands::pi_agent::pi_spawn,
    commands::pi_agent::pi_send,
    commands::pi_agent::pi_abort,
    commands::pi_agent::pi_get_status,
    commands::pi_agent::pi_test_connection,
    commands::system::get_system_info,
])
```

---

## 2. commands/file.rs — 文档文件 I/O

```rust
// commands/file.rs

/// 打开 .docx 文件，返回原始字节
/// 路径由 Tauri 文件对话框选择，Rust 端做路径沙箱校验
#[tauri::command]
#[specta::specta]
pub fn open_docx(path: String) -> Result<Vec<u8>, String> {
    // 校验：路径必须在用户允许的范围内（Tauri capability）
    // 返回：完整 OOXML 字节（前端负责传给 docx-editor 解析）
    // 错误：文件不存在、权限不足、非 ZIP/OOXML 格式
}

/// 保存 .docx 文件到原路径
#[tauri::command]
#[specta::specta]
pub fn save_docx(path: String, data: Vec<u8>) -> Result<(), String> {
    // 校验：路径可写、buffer 非空
    // 副作用：同时写入 autosave 备份
    // 错误：磁盘满、权限不足、文件被占用
}

/// 另存为（与 save_docx 逻辑相同，但 path 由前端对话框提供）
#[tauri::command]
#[specta::specta]
pub fn save_as_docx(path: String, data: Vec<u8>) -> Result<(), String> {
    // 同 save_docx
}

/// 获取最近文件列表（从系统或应用配置中读取）
#[tauri::command]
#[specta::specta]
pub fn get_recent_files() -> Result<Vec<RecentFile>, String> {
    // 从本地 JSON 文件读取
}

// 类型
#[derive(serde::Serialize, specta::Type)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub last_opened_at: u64,
}
```

---

## 3. commands/pi_agent.rs — pi agent 子进程管理

```rust
// commands/pi_agent.rs

use crate::pi;

/// 启动 pi agent 子进程（RPC 模式）
#[tauri::command]
#[specta::specta]
pub fn pi_spawn(app_handle: tauri::AppHandle) -> Result<(), String> {
    pi::spawn(app_handle)
}

/// 向 pi agent 发送 JSON 命令
#[tauri::command]
#[specta::specta]
pub fn pi_send(app_handle: tauri::AppHandle, json: String) -> Result<(), String> {
    pi::send(&app_handle, &json)
}

/// 中止当前 pi agent 请求
#[tauri::command]
#[specta::specta]
pub fn pi_abort(app_handle: tauri::AppHandle) -> Result<(), String> {
    pi::abort(&app_handle)
}

/// 查询 pi 子进程状态
#[tauri::command]
#[specta::specta]
pub fn pi_get_status(app_handle: tauri::AppHandle) -> Result<PiStatus, String> {
    pi::get_status(&app_handle)
}

/// 测试 API 连接
#[tauri::command]
#[specta::specta]
pub fn pi_test_connection(config: ApiConfig) -> Result<bool, String> {
    // 临时 spawn pi 子进程，发送 list_models 命令
    // 返回 true/false
}

// 类型
#[derive(serde::Serialize, specta::Type)]
pub enum PiStatus {
    Running,
    Busy,
    Stopped,
    Error(String),
}

#[derive(serde::Deserialize, specta::Type)]
pub struct ApiConfig {
    pub api_type: String,     // "openai-completions" | "openai-responses" | "anthropic"
    pub api_key: String,
    pub base_url: String,
    pub model: String,
}
```

### pi/ 子模块

```rust
// src-tauri/src/pi/mod.rs

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

// 全局状态
static PI_PROCESS: Mutex<Option<Child>> = Mutex::new(None);
static PI_STDIN: Mutex<Option<std::process::ChildStdin>> = Mutex::new(None);

pub fn spawn(app_handle: &AppHandle) -> Result<(), String> {
    // 1. 获取 pi agent 路径（环境变量或内置）
    // 2. spawn: pi --mode rpc --agent-dir <config_dir>
    //    配置 stdin/stdout 为 pipe
    // 3. 启动后台线程读取 stdout 行
    //    解析 JSON → app_handle.emit("pi:text_delta", ...)
    // 4. 保存 Child + stdin 到全局状态
}

pub fn send(app_handle: &AppHandle, json: &str) -> Result<(), String> {
    // 向 PI_STDIN 写入一行 JSON + '\n'
}

pub fn abort(app_handle: &AppHandle) -> Result<(), String> {
    // 向 PI_STDIN 写入 {"command": "abort"}
}

pub fn get_status(app_handle: &AppHandle) -> Result<PiStatus, String> {
    // 检查子进程是否存活
}
```

`Cargo.toml` 新增依赖：
```toml
tauri-plugin-shell = "2"    # 或直接用 std::process::Command
```

---

## 4. Agent 交互命令契约（Phase 3）

> **背景**: Phase 3 前后端对接前契约必须定稿。Phase 1-2 涉及的 3 个 Keychain 命令在此一并定义。

### 4.1 API Key 管理

```rust
// commands/pi_agent.rs (或独立 commands/keychain.rs)

/// 从系统 Keychain 读取 API Key（返回 masked）
#[tauri::command]
#[specta::specta]
async fn get_api_key_masked(provider: String) -> Result<String, String> {
    // 校验：provider ∈ ["anthropic", "openai", "openai-compatible"]
    // 返回：前 4 位 + "..." + 后 4 位；未配置时返回空字符串
}

/// 写入 API Key 到系统 Keychain（前端传完整 Key）
#[tauri::command]
#[specta::specta]
async fn set_api_key(provider: String, key: String) -> Result<(), String> {
    // 校验：provider 白名单、key 非空
    // 副作用：更新 pi-agent/auth.json（若进程运行中）
    // 错误：Keychain 写入失败
}

/// 删除 Keychain 中的 API Key
#[tauri::command]
#[specta::specta]
async fn delete_api_key(provider: String) -> Result<(), String> {
    // 校验：provider 白名单
}
```

### 4.2 Agent 进程控制

```rust
/// 发送 prompt 给 pi agent
#[tauri::command]
#[specta::specta]
async fn agent_send(
    prompt: String,                          // 完整 prompt（含上下文注入）
    mode: Option<String>,                    // "default" | "steer" | "enqueue"
    session_id: Option<String>,              // 文档 hash（无文档时省略）
) -> Result<String, String> {               // 返回消息 ID
    // 校验：prompt 非空、prompt ≤ 100KB（防止超大注入）
    // 行为：见 TSS §5.2 前端消息发送模式
    // 事件流：pi:text_delta / pi:tool_call / pi:agent_end / pi:error
    // 错误：pi 未安装、进程崩溃、Provider 不可用
}

/// 中止当前 Agent 操作
#[tauri::command]
#[specta::specta]
async fn agent_abort() -> Result<(), String> {
    // 行为：发送 abort 到 pi stdin；清空 pending 队列
    // 注意：不 kill 进程，仅中止当前 turn
}

/// 获取 Agent 进程状态
#[tauri::command]
#[specta::specta]
async fn agent_get_status() -> Result<AgentStatus, String> {
    // 返回：NotInstalled | Idle | Streaming | Dead | ShuttingDown
}

// 类型
struct AgentStatus {
    state: String,           // 当前状态："NotInstalled" | "Idle" | "Streaming" | "Dead" | "ShuttingDown"
    pending_count: u32,      // 队列中待处理消息数
    session_id: Option<String>,
}
```

### 4.3 IPC 性能考量

| 场景 | 方案 | 说明 |
|------|------|------|
| 大文件 buffer 传输 | `Vec<u8>` 通过 Tauri IPC 序列化 | 100MB 文档约 1-2 秒传输（macOS 本地 IPC） |
| 流式文本 | Tauri Event (`pi:text_delta`) | 逐 token 推送，前端增量渲染 |
| 高频查询 | Zustand + 前端缓存 | 避免频繁 invoke Tauri command |

---

## 5. commands/system.rs — 系统信息

```rust
// commands/system.rs

/// 获取系统信息（语言、平台等）
#[tauri::command]
#[specta::specta]
pub fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        locale: sys_locale::get_locale().unwrap_or_else(|| "en".to_string()),
    })
}

#[derive(serde::Serialize, specta::Type)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub locale: String,
}
```

`Cargo.toml` 新增依赖：
```toml
sys-locale = "0.3"
```

---

## 6. 安全注意事项

| 项目 | 措施 |
|------|------|
| `open_docx` path | 校验扩展名 `.docx`，拒绝 `../` 路径遍历 |
| `pi_spawn` | 不允许从网络路径加载二进制 |
| `pi_send` json | 不做内容校验，由 pi agent 自身处理 |
| `agent_send` prompt | 限制 prompt ≤ 100KB，防止超大注入 |
| API Key | 通过系统 Keychain 存储，前端仅见 masked key；pi 进程通过环境变量注入（见 data-persistence.md §4.2.1） |
| 所有命令 | 返回 `Result<T, String>`，前端必须处理 `status === "error"` |
