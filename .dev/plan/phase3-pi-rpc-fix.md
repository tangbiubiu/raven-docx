# Phase 3 pi RPC 协议修复方案

> **状态**: 待实施
> **来源**: Phase 2 审查发现 pi-backend 实现与真实 pi RPC 协议不匹配
> **协议参考**: `omp://rpc.md`（pi `--mode rpc` 权威协议文档）

---

## 0. 问题概要

当前 `src-tauri/src/pi/mod.rs` 和 `src-tauri/src/commands/pi_agent.rs` 中的 stdin/stdout 通信格式是基于**猜测**编写的，与 pi 二进制的实际 RPC 协议完全不兼容。

涉及以下三个维度：
1. **stdin 命令格式错误** — 字段名、命令类型、并发语义全部不对
2. **stdout 事件解析错误** — 事件嵌套结构、响应帧、ready 帧全部未处理
3. **CLI 参数和连接测试命令不存在**

---

## 1. pi RPC 协议速查（摘自 `omp://rpc.md`）

> 协议权威定义位于 pi 源码 `src/modes/rpc/rpc-types.ts` 和 `packages/agent/src/agent.ts`。

### 1.1 启动

- pi 启动后**先行** emit `{"type": "ready"}`，然后才开始处理命令
- 必须在收到 ready 帧后再写 stdin
- pi 使用 `--mode rpc` 启动，`@file` CLI 参数被拒绝

### 1.2 命令（stdin → pi）

每条命令为一行 JSON，可选 `"id"` 字段用于响应关联：

```jsonc
// === 提示 ===
{ "id?": str, "type": "prompt", "message": str, "images"?: [], "streamingBehavior"?: "steer" | "followUp" }
{ "id?": str, "type": "steer", "message": str, "images"?: [] }
{ "id?": str, "type": "follow_up", "message": str, "images"?: [] }
{ "id?": str, "type": "abort" }
{ "id?": str, "type": "abort_and_prompt", "message": str, "images"?: [] }
{ "id?": str, "type": "new_session", "parentSession"?: str }

// === 状态与配置 ===
{ "id?": str, "type": "get_state" }
{ "id?": str, "type": "set_model", "provider": str, "modelId": str }
{ "id?": str, "type": "get_available_models" }
{ "id?": str, "type": "set_thinking_level", "level": "off" | "minimal" | "low" | "medium" | "high" | "xhigh" }

// === 队列策略 ===
{ "id?": str, "type": "set_steering_mode", "mode": "all" | "one-at-a-time" }
{ "id?": str, "type": "set_follow_up_mode", "mode": "all" | "one-at-a-time" }
{ "id?": str, "type": "set_interrupt_mode", "mode": "immediate" | "wait" }

// === 会话 ===
{ "id?": str, "type": "get_session_stats" }
{ "id?": str, "type": "switch_session", "sessionPath": str }
{ "id?": str, "type": "get_messages" }
```

### 1.3 响应（stdout ← pi）

每个命令收到后立即回复一个 `RpcResponse`：

```jsonc
// 成功
{ "id": "req_1", "type": "response", "command": "prompt", "success": true }

// 失败
{ "id": "req_2", "type": "response", "command": "set_model", "success": false, "error": "Model not found" }
```

**关键**：`prompt` / `abort_and_prompt` 的 success ack **不等于任务完成**。最终完成通过 `agent_end` 事件观察。

### 1.4 事件流（stdout ← pi）

```jsonc
// 启动
{ "type": "ready" }

// 会话生命周期
{ "type": "agent_start" }
{ "type": "agent_end", "messages": [...] }

// Turn 边界
{ "type": "turn_start" }
{ "type": "turn_end" }

// 消息（含流式增量）
{ "type": "message_update", "assistantMessageEvent": { "type": "text_delta", "delta": "..." }, "message": {...} }
{ "type": "message_update", "assistantMessageEvent": { "type": "thinking_delta", "delta": "..." }, "message": {...} }
{ "type": "message_update", "assistantMessageEvent": { "type": "tool_call_delta", ... }, "message": {...} }

// 工具执行
{ "type": "tool_execution_start", ... }
{ "type": "tool_execution_end", ... }

// 扩展 UI
{ "type": "extension_ui_request", "id": "ui_7", "method": "confirm", "title": "...", "message": "..." }

// 扩展错误
{ "type": "extension_error", "extensionPath": "...", "event": "...", "error": "..." }
```

### 1.5 并发语义（重要）

- 在 Streaming 期间，`prompt` **必须**携带 `streamingBehavior`：
  - `"steer"` → 中断路径（当前 turn 完成后注入）
  - `"followUp"` → 追加路径（当前 turn 结束后送入）
  - **省略则在 Streaming 时 `prompt` 失败**
- pi 内部管理自己的队列；pi 默认 `steeringMode: "one-at-a-time"`、`followUpMode: "one-at-a-time"`
- `steer` 命令本身就是「中断 + 新消息」的原子操作，无需先 abort 再 prompt

### 1.6 CLI 参数

| pi CLI 参数 | 作用 |
|------------|------|
| `--mode rpc` | 启用 RPC 模式 |
| `--session-dir <dir>` | session 存储目录 |
| `--session-id <id>` | 按精确 ID 创建 session（不存在则新建） |
| `--session <path\|id>` | 按 UUID 片段查找已有 session（不会新建） |
| `--no-session` | 不保存 session（无状态） |
| `--api-key <key>` | 直接传入 API Key（优先级高于 env var） |
| `--provider <name>` | LLM provider |
| `--model <pattern>` | 模型 ID |
| `PI_CODING_AGENT_DIR` | 环境变量，配置目录（默认 `~/.pi/agent`） |

**注意**：`--agent-dir` 不存在于 pi CLI！

---

## 2. 修改方案

### 2.1 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src-tauri/src/pi/mod.rs` | **重写** | 命令格式、事件解析、spawn CLI、队列逻辑全部重构 |
| `src-tauri/src/commands/pi_agent.rs` | **重写** | `agent_test_connection` 完全重写；其余命令适配新签名 |
| `src-tauri/Cargo.toml` | **增删依赖** | 可能不需要变更（serde_json/tokio 已具备） |
| `src/lib/bindings.ts` | **自动生成** | 运行 `cargo run --bin generate_bindings` 重新生成 |
| `src/lib/tauri-events.ts` | **小改** | 前端事件监听适配新的事件结构 |
| `src/stores/useAgentStore.ts` | **不改** | 现有 store 接口不变，仅事件处理适配 |
| `src/features/agent/hooks/useAgentSession.ts` | **小改** | 事件 payload 结构适配 |

### 2.2 核心改动：stdin 命令格式

#### 当前代码（`pi/mod.rs:546-567` write_to_stdin）

```rust
// ❌ 错误的格式
let cmd = serde_json::json!({
    "command": "prompt",      // 应为 "type"
    "text": prompt,            // 应为 "message"
    "message_id": message_id,  // 应为 "id"
});
```

#### 修复后

废除 `write_to_stdin` 单用途方法，替换为按命令类型分派的写入方法：

```rust
/// 写入 RPC 命令帧
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

/// 发送 prompt（普通、非流式）
async fn send_prompt_command(&self, message: &str, id: &str) -> Result<(), String> {
    self.send_rpc_command(serde_json::json!({
        "type": "prompt",
        "id": id,
        "message": message,
        // 不传 streamingBehavior → 在非 Streaming 状态下是合法的
    })).await
}

/// 发送 prompt（流式期间，用作 follow-up）
async fn send_follow_up_command(&self, message: &str, id: &str) -> Result<(), String> {
    self.send_rpc_command(serde_json::json!({
        "type": "prompt",
        "id": id,
        "message": message,
        "streamingBehavior": "followUp",
    })).await
}

/// 发送 steer（中断 + 新消息，原子操作）
async fn send_steer_command(&self, message: &str, id: &str) -> Result<(), String> {
    self.send_rpc_command(serde_json::json!({
        "type": "steer",
        "id": id,
        "message": message,
    })).await
}

/// 发送 abort
async fn send_abort_command(&self, id: &str) -> Result<(), String> {
    self.send_rpc_command(serde_json::json!({
        "type": "abort",
        "id": id,
    })).await
}
```

#### send_prompt 三种 mode 重构

| 当前实现 | 修复后 |
|---------|--------|
| `Default` → 本地 `VecDeque` 队列 | `Default` → 当前 Idle 直接 `send_prompt_command`(无 streamingBehavior)；当前 Streaming → `send_follow_up_command`(带 streamingBehavior: "followUp") → pi 内部管理队列，rust 端不再维护 `pending` 队列 |
| `Steer` → `abort()` + `prompt()` | `Steer` → 直接 `send_steer_command`（一步到位，pi 自动处理中断和队列清空） |
| `Enqueue` → 本地 `VecDeque` | `Enqueue` → `send_follow_up_command`（pi 内部队列处理） |

> **设计决策**：移除 Rust 端自定义消息队列（`pending: VecDeque<QueuedMessage>`）。pi RPC 自身已具备完整的队列管理（steer/followUp），自定义队列反而造成语义冲突。TSS §5.2 中的入队/出队逻辑改由 pi 内部处理。

### 2.3 核心改动：stdout 事件解析

#### 当前代码（`pi/mod.rs:676-700` PiEvent enum）

```rust
// ❌ 错误：这些不是顶层 type
#[serde(tag = "type")]
enum PiEvent {
    #[serde(rename = "text_delta")]   // 实际在 message_update 内部
    TextDelta { text: String, message_id: String },
    #[serde(rename = "tool_call")]    // 同上
    ToolCall { name: String, args: Value, message_id: String },
    #[serde(rename = "agent_end")]    // 顶层 event 但字段不对
    AgentEnd { message_id: String },
    #[serde(rename = "error")]        // 不存在此 event type
    Error { message: String, message_id: Option<String> },
}
```

#### 修复后

按 pi 实际 emit 的帧类型分层解析。第一层用 `#[serde(tag = "type")]` 按顶层 `type` 分发，第二层在 `message_update` 内部用枚举匹配：

```rust
/// stdout 顶层帧（用 tag = "type" 分发）
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

    // === Agent 会话事件 ===
    #[serde(rename = "agent_start")]
    AgentStart,

    #[serde(rename = "agent_end")]
    AgentEnd {
        #[serde(default)]
        messages: Vec<serde_json::Value>,
    },

    /// 消息更新（含流式增量）— 嵌套结构
    #[serde(rename = "message_update")]
    MessageUpdate {
        #[serde(default)]
        id: Option<String>,
        assistantMessageEvent: AssistantMessageEvent,
        #[serde(default)]
        message: serde_json::Value,
    },

    #[serde(rename = "message_start")]
    MessageStart,

    #[serde(rename = "message_end")]
    MessageEnd,

    // === Turn 边界 ===
    #[serde(rename = "turn_start")]
    TurnStart,
    #[serde(rename = "turn_end")]
    TurnEnd,

    // === 工具执行 ===
    #[serde(rename = "tool_execution_start")]
    ToolExecutionStart,
    #[serde(rename = "tool_execution_end")]
    ToolExecutionEnd,

    // === 扩展 ===
    #[serde(rename = "extension_ui_request")]
    ExtensionUIRequest {
        id: String,
        method: String,
        #[serde(default)]
        title: Option<String>,
        #[serde(default)]
        message: Option<String>,
    },
    #[serde(rename = "extension_error")]
    ExtensionError,

    // 兜底：未知帧类型
    #[serde(other)]
    Unknown,
}

/// message_update 内部的增量事件类型
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum AssistantMessageEvent {
    /// 文本增量
    #[serde(rename = "text_delta")]
    TextDelta { delta: String },
    /// 思考增量
    #[serde(rename = "thinking_delta")]
    ThinkingDelta { delta: String },
    /// 工具调用增量
    #[serde(rename = "tool_call_delta")]
    ToolCallDelta,
    #[serde(other)]
    Unknown,
}
```

#### 事件分发逻辑

```rust
// 在 stdout reader 循环中：
match serde_json::from_str::<RpcFrame>(&line) {
    Ok(RpcFrame::Ready) => {
        log::info!("[pi] RPC 就绪（收到 ready 帧）");
        self.set_state(PiState::Idle).await;
    }

    Ok(RpcFrame::Response { id, command, success, error, .. }) => {
        if success {
            log::info!("[pi] 命令成功: command={}, id={:?}", command, id);
        } else {
            log::error!("[pi] 命令失败: command={}, error={:?}", command, error);
            // 将命令级错误 emit 到前端
            if let Some(handle) = self.get_app_handle().await {
                let _ = handle.emit("pi:error", serde_json::json!({
                    "message": error.unwrap_or_else(|| format!("命令 {} 失败", command)),
                    "command": command,
                }));
            }
        }
    }

    Ok(RpcFrame::AgentStart) => {
        if let Some(handle) = self.get_app_handle().await {
            let _ = handle.emit("pi:agent_start", serde_json::json!({}));
        }
    }

    Ok(RpcFrame::AgentEnd { .. }) => {
        if let Some(handle) = self.get_app_handle().await {
            let _ = handle.emit("pi:agent_end", serde_json::json!({}));
        }
        // agent_end 后更新状态
        let mut st = self.state.lock().await;
        if *st == PiState::Streaming {
            *st = PiState::Idle;
        }
    }

    Ok(RpcFrame::MessageUpdate { assistantMessageEvent, .. }) => {
        match assistantMessageEvent {
            AssistantMessageEvent::TextDelta { delta } => {
                if let Some(handle) = self.get_app_handle().await {
                    let _ = handle.emit("pi:text_delta", serde_json::json!({
                        "text": delta,   // 注意：字段名改为 delta
                    }));
                }
            }
            AssistantMessageEvent::ThinkingDelta { delta } => {
                // MVP 阶段可忽略，后续用于展示思考过程
                log::info!("[pi] thinking: {}", delta);
            }
            AssistantMessageEvent::ToolCallDelta => {
                if let Some(handle) = self.get_app_handle().await {
                    let _ = handle.emit("pi:tool_call", serde_json::json!({}));
                }
            }
            _ => {}
        }
    }

    Ok(RpcFrame::ExtensionUIRequest { id, method, title, message }) => {
        // MVP 阶段自动确认所有 UI 请求
        log::info!("[pi] 扩展 UI 请求: method={}, id={}", method, id);
        self.send_rpc_command(serde_json::json!({
            "type": "extension_ui_response",
            "id": id,
            "confirmed": true,   // 自动确认
        })).await.ok();
    }

    Ok(RpcFrame::Unknown) | Err(_) => {
        log::warn!("[pi] 无法解析 stdout 帧: {}", line);
    }

    _ => {
        // 其他事件类型不处理
    }
}
```

### 2.4 核心改动：spawn CLI 参数

#### 当前代码（`pi/mod.rs:210-229`）

```rust
// ❌ --agent-dir 不存在，--session 用于查找而非创建
cmd.arg("--mode").arg("rpc")
    .arg("--agent-dir").arg(&agent_dir);
if let Some(sid) = &session_id {
    cmd.arg("--session").arg(sid);
}
```

#### 修复后

```rust
let pi_agent_dir = Self::pi_agent_dir()?;
let session_dir = pi_agent_dir.join("sessions");

cmd.arg("--mode").arg("rpc")
    .arg("--session-dir").arg(&session_dir);

// 按 session ID 精确创建（不存在则新建）
if let Some(sid) = &session_id {
    cmd.arg("--session-id").arg(sid);
} else {
    // 无 session → 不持久化
    cmd.arg("--no-session");
}

// API Key 通过环境变量传入（pi 按 provider 读取对应 env var）
// 例如：provider=anthropic → ANTHROPIC_API_KEY
// provider=openai → OPENAI_API_KEY
// 实际 key 从系统 Keychain 读取，此处仅传 env var 名不传值
// 注：由于 key 存储在 Keychain，需在 spawn 时从 Keychain 读取并注入
if let Some(key) = get_api_key_for_provider(provider).await {
    cmd.env(provider_env_var(provider), key);
}

// 设置 pi 配置目录（默认是 ~/.pi/agent，我们使用 app 专属目录）
cmd.env("PI_CODING_AGENT_DIR", &pi_agent_dir);

// 可选：指定 provider 和 model
if let Some(p) = provider { cmd.arg("--provider").arg(p); }
if let Some(m) = model { cmd.arg("--model").arg(m); }
```

### 2.5 核心改动：spawn 流程（加入 ready 等待）

#### 当前代码

```rust
// spawn 后直接 start_stdout_reader → 写入 stdin（无 ready 等待）
self.set_state(PiState::Idle).await;
self.start_stdout_reader(child_stdout, ...);
```

#### 修复后

```rust
// 1. spawn 子进程
// 2. 启动 stdout reader（持续监听）
self.start_stdout_reader(child_stdout, ...);

// 3. 等待 ready 帧（带超时）
let mut wait_ready = self.wait_for_ready.clone();
tokio::spawn(async move {
    // ready 帧由 stdout reader 收到后通过 oneshot channel 通知
    match tokio::time::timeout(Duration::from_secs(30), &mut wait_ready).await {
        Ok(Ok(())) => log::info!("[pi] RPC ready confirmed"),
        Ok(Err(_)) => log::error!("[pi] ready channel closed"),
        Err(_) => log::error!("[pi] 等待 ready 超时（30s）"),
    }
});
```

> **实现方案**：在 `AgentManager` 中新增 `ready_signal: Arc<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>`。spawn 时创建 oneshot channel，stdout reader 收到 `RpcFrame::Ready` 后 `send(())`。`agent_send` 在 ready 前调用时等待此信号。

### 2.6 核心改动：agent_test_connection

#### 当前问题

`list_models` 不是有效的 RPC 命令。正确的 RPC 命令是 `get_available_models`，但它返回的是已配置 provider 的模型列表，不验证 API Key 有效性。

#### 修复方案

放弃通过 pi RPC 测试连接，改为**在 Rust 端直接发 HTTP 请求**验证 API Key。使用 `reqwest`（已是 Tauri 传递依赖）调 LLM API 的 models endpoint：

```rust
/// 测试 API 连接（直接 HTTP 调用）
#[tauri::command]
#[specta::specta]
pub async fn agent_test_connection(
    api_type: String,
    api_key: String,
    base_url: Option<String>,
    _model: Option<String>,
) -> Result<bool, String> {
    let client = reqwest::Client::new();

    let url = match api_type.as_str() {
        "anthropic" => "https://api.anthropic.com/v1/models",
        "openai" => base_url.as_deref().unwrap_or("https://api.openai.com/v1/models"),
        "google" => {
            // Google 用 models.list?key=<api_key>
            let base = base_url.as_deref().unwrap_or("https://generativelanguage.googleapis.com/v1beta");
            return test_google_connection(&client, base, &api_key).await;
        }
        _ => return Err(format!("不支持的 API 类型: {}", api_type)),
    };

    let mut req = client.get(url).timeout(Duration::from_secs(15));
    match api_type.as_str() {
        "anthropic" => {
            req = req.header("x-api-key", &api_key)
                   .header("anthropic-version", "2023-06-01");
        }
        "openai" => {
            req = req.header("Authorization", format!("Bearer {}", api_key));
        }
        _ => {}
    }

    let resp = req.send().await.map_err(|e| format!("请求失败: {}", e))?;
    Ok(resp.status().is_success())
}
```

> 如不希望引入 `reqwest` 额外依赖，可用 `ureq`（同步）或保留当前临时 spawn pi + `get_available_models` 的方式（但需改为正确的命令格式并等待 ack）。

### 2.7 前端适配：事件 payload 变更

#### tauri-events.ts

新增事件类型：

```typescript
export type PiEventType =
  | "text_delta"      // payload: { text: string }  （字段名从 message_id 移除）
  | "tool_call"       // payload: {}（event 内无具体内容，后续阶段增强）
  | "agent_end"       // payload: {}（messages 暂不使用）
  | "agent_start"     // payload: {}
  | "error"           // payload: { message: string, command?: string }
  | "queued";         // 移除（由 pi 内部管理队列）
```

#### useAgentSession.ts

`text_delta` 处理适配新 payload：

```typescript
// 旧
onPiEvent("text_delta", (payload) => {
  updateMessage(msg.id, msg.content + payload.text);
});

// 新
onPiEvent("text_delta", (payload) => {
  updateMessage(msg.id, msg.content + payload.text);
  // payload 结构不变（仍为 { text: string }），但来自 Rust 层的字段名已改为 "text"
});
```

> 实际上 emit 的 JSON key 保持 `"text"` 不变，前端代码**无需修改**。仅 Rust 端 deserialize 结构变化。

---

## 3. 改动后的数据流

### 3.1 完整交互时序

```
前端 send("润色这段文字")
    │
    ▼
Tauri Command: agent_send(prompt, mode, session_id)
    │
    ├── 若 state == Stopped/NotInstalled → spawn()
    │     ├── cmd: pi --mode rpc --session-dir <dir> --session-id <id>
    │     ├── start_stdout_reader (tokio task)
    │     └── 等待 ready 帧 (30s 超时)
    │
    ├── 发送命令:
    │     若 Streaming: { type: "prompt", id: "msg_xxx", message: "...", streamingBehavior: "followUp" }
    │     若 Idle:      { type: "prompt", id: "msg_xxx", message: "..." }
    │     Steer 模式:    { type: "steer", id: "msg_xxx", message: "..." }
    │     Abort:         { type: "abort", id: "abort_xxx" }
    │
    ▼
pi RPC stdout:
    { "type": "response", "command": "prompt", "success": true }   ← 立即 ack
    { "type": "agent_start" }
    { "type": "message_update", "assistantMessageEvent": { "type": "text_delta", "delta": "润色后的文字..." }, ... }
    { "type": "message_update", "assistantMessageEvent": { "type": "text_delta", "delta": "..." }, ... }
    ... (多次 message_update)
    { "type": "agent_end", "messages": [...] }
    │
    ▼
Rust stdout reader:
    RpcFrame::Response → 日志记录
    RpcFrame::AgentStart → emit "pi:agent_start"
    RpcFrame::MessageUpdate { TextDelta { delta } } → emit "pi:text_delta" { text: delta }
    RpcFrame::AgentEnd → emit "pi:agent_end"
    │
    ▼
前端 useAgentSession:
    pi:text_delta → useAgentStore.updateMessage(id, content + payload.text)
    pi:agent_end → finishStreaming(id) + setStatus("ready")
```

### 3.2 消息队列处理（pi 内部管理）

```
用户连续发送 3 条消息（Agent 忙碌中）：

send("润色")   → { type: "prompt", streamingBehavior: "followUp", message: "润色" }
send("翻译")   → { type: "prompt", streamingBehavior: "followUp", message: "翻译" }
send("总结")   → { type: "prompt", streamingBehavior: "followUp", message: "总结" }

pi 内部队列：
  [followUp: 润色] → [followUp: 翻译] → [followUp: 总结]

当前 turn agent_end 后：
  pi 自动按 followUpMode (one-at-a-time) 出队第一条 → 新 turn 开始
  译 → agent_end → 出队第二条
  总结 → agent_end → 队列为空
```

> Rust 端不再维护 `pending: VecDeque`。队列由 pi 原生管理。前端如需排队指示，可通过 `{ type: "get_state" }` 查询 `queuedMessageCount`。

---

## 4. 移除的代码

| 位置 | 移除项 | 原因 |
|------|--------|------|
| `pi/mod.rs:67-83` | `SendMode` enum | 不再需要自定义 mode 枚举，映射直接对应 pi 命令类型 |
| `pi/mod.rs:85-102` | `QueuedMessage` / `SessionMeta` 结构体 | 队列由 pi 管理；Session 由 `--session-id` 管理 |
| `pi/mod.rs:116` | `pending: Arc<Mutex<VecDeque<QueuedMessage>>>` | pi 内部队列替代 |
| `pi/mod.rs:121-124` | `sessions` / `current_session` 字段 | 由 pi `--session-id` 管理 |
| `pi/mod.rs:488-543` | `send_prompt` 中的入队/steer 逻辑 | 替换为直接对应 pi 命令类型的方法 |
| `pi/mod.rs:569-593` | `abort` 方法（旧版） | 替换为 `send_abort_command` |
| `pi/mod.rs:676-700` | `PiEvent` enum（旧版） | 替换为 `RpcFrame` + `AssistantMessageEvent` |
| `pi/mod.rs:320-365` | agent_end 后的出队逻辑 | pi 自动处理，rust 端仅触发状态变更 |
| `commands/pi_agent.rs:88-157` | `agent_test_connection`（旧版） | 替换为 HTTP 直连验证 |

---

## 5. Tauri Event 契约（前端接口不变）

尽管内部实现完全重写，emit 到前端的 Tauri Event **名称和 payload 结构尽量保持不变**，降低前端改动：

| Event 名称 | Payload | 说明 |
|-----------|---------|------|
| `pi:text_delta` | `{ text: string }` | 不变 |
| `pi:tool_call` | `{}` | 简化为空对象（MVP 阶段不解析工具调用细节） |
| `pi:agent_end` | `{}` | 移除 `message_id`（前端不依赖它） |
| `pi:agent_start` | `{}` | 新增 |
| `pi:error` | `{ message: string, command?: string }` | 新增 `command` 可选字段 |
| `pi:queued` | — | **移除**（由 pi 内部管理，后续如需可通过 `get_state` 查询 `queuedMessageCount`） |

---

## 6. 实施步骤

### Step 1: 重写 `pi/mod.rs`

按 §2.2–2.6 重写：
- stdin: `send_rpc_command` → `send_prompt_command` / `send_steer_command` / `send_abort_command`
- stdout: `RpcFrame` enum + `AssistantMessageEvent` enum + 分发逻辑
- spawn: 修正 CLI 参数 + ready 帧等待
- 移除: `pending` 队列、`SendMode`、旧 `PiEvent`、出队逻辑

### Step 2: 重写 `commands/pi_agent.rs`

- `agent_send`：移除 session_id 的 hash 计算（改为传原始 doc_id 给 `--session-id`）；适配新的 `send_prompt` 签名
- `agent_abort`：直接调用 `send_abort_command`
- `agent_test_connection`：HTTP 直连实现
- `agent_get_status`：通过 `RpcFrame::get_state` 查询 pi 进程状态

### Step 3: 生成 bindings + 前端适配

```bash
cd src-tauri && cargo run --bin generate_bindings
```

验证 `bindings.ts` 中命令签名无 breaking change，然后检查 `useAgentSession.ts` 事件监听。

### Step 4: 编译 + 测试

```bash
cd src-tauri && cargo check          # Rust 编译
bun run typecheck                     # TS 类型检查
bun run test -- --run                # 全量测试
```

### Step 5: 端到端验证

```bash
bun tauri dev
# 1. 确认 pi 已安装：which pi
# 2. 在设置中配置 API Key
# 3. 打开文档 → Agent 侧边栏 → 发送消息
# 4. 验证流式输出正常
# 5. 验证中断/重试功能
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| pi ready 帧等待超时 | agent 不可用 | 设置 30s 超时 + emit pi:error 通知前端 |
| `extension_ui_request` 弹窗阻塞 | 自动确认可能产生非预期行为 | MVP 阶段全部自动确认；后续阶段增加前端 UI 响应 |
| `message_update` 结构在不同 pi 版本间变化 | 解析失败 | 使用 `#[serde(other)]` 兜底 + 日志 warn 未知类型 |
| API Key 环境变量注入仍需 Keychain 读取 | spawn 时需额外 Tauri command | `agent_spawn` 前从 Keychain 读取并注入 env var；或通过 `--api-key` CLI 传参 |

---

## 8. 后续优化（非 MVP）

| 项目 | 说明 |
|------|------|
| 前端 UI 响应 `extension_ui_request` | pi 扩展弹窗（confirm/input/select）交给前端渲染，替代自动确认 |
| `pi:queued` 排队指示恢复 | 通过 `get_state` 轮询或 pi `agent_update` 事件获取 `queuedMessageCount` |
| `set_model` / `set_thinking_level` | 前端切换模型/思考深度时通过 RPC 命令通知 pi |
| `set_host_tools` | 将 DocumentAgent 的编程式文档操作注册为 pi 的 host tool |
| `agent_update` 事件 | 监听 pi 的 todo、状态变更事件同步到前端 |
