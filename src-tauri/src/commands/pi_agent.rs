// commands/pi_agent.rs — pi agent Tauri 命令
// 提供前端调用的 5 个命令：agent_spawn / agent_send / agent_abort / agent_get_status / agent_test_connection

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::pi::{AgentManager, PiState, SendMode};

/// Agent 状态响应
#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct AgentStatus {
    pub state: String,
    pub pending_count: u32,
    pub session_id: Option<String>,
}

/// 启动 pi agent 子进程（懒启动，首次请求时自动调用）
#[tauri::command]
#[specta::specta]
pub async fn agent_spawn(
    app: AppHandle,
    manager: State<'_, AgentManager>,
    session_id: Option<String>,
) -> Result<(), String> {
    manager.set_app_handle(app).await;
    manager.spawn(session_id).await
}

/// 发送 prompt 给 pi agent
/// mode: "default" | "steer" | "enqueue"
/// session_id: 文档 hash，无文档时为 None
#[tauri::command]
#[specta::specta]
pub async fn agent_send(
    app: AppHandle,
    manager: State<'_, AgentManager>,
    prompt: String,
    mode: Option<String>,
    session_id: Option<String>,
) -> Result<String, String> {
    // 确保 AppHandle 已设置
    manager.set_app_handle(app).await;

    // 如果进程未运行或已崩溃，先 spawn
    let state = manager.get_state().await;
    if state == PiState::Stopped || state == PiState::NotInstalled || state == PiState::Dead {
        manager.spawn(session_id).await?;
    }

    let send_mode = mode.as_deref().map(SendMode::from_str).unwrap_or(SendMode::Default);
    manager.send_prompt(prompt, send_mode).await
}

/// 中止当前 Agent 操作
#[tauri::command]
#[specta::specta]
pub async fn agent_abort(manager: State<'_, AgentManager>) -> Result<(), String> {
    manager.abort().await
}

/// 获取 Agent 进程状态
#[tauri::command]
#[specta::specta]
pub async fn agent_get_status(manager: State<'_, AgentManager>) -> Result<AgentStatus, String> {
    let state = manager.get_state().await;
    let pending_count = manager.get_pending_count().await;
    let session_id = manager.get_current_session().await;

    Ok(AgentStatus {
        state: state.to_string(),
        pending_count,
        session_id,
    })
}

/// 测试 API 连接（临时 spawn pi + list_models）
///
/// 验证 API Key 是否可用。临时启动 pi 进程调用 list_models，
/// 验证后立即关闭。不保留进程。
#[tauri::command]
#[specta::specta]
pub async fn agent_test_connection(
    api_type: String,
    api_key: String,
    base_url: Option<String>,
    _model: Option<String>,
) -> Result<bool, String> {
    use std::process::Stdio;
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::process::Command;
    use tokio::time::timeout;
    use std::time::Duration;

    // 检查 pi 是否安装
    if !AgentManager::check_pi_installed() {
        return Err("pi 未安装，无法测试连接".to_string());
    }

    let agent_dir = AgentManager::pi_agent_dir()?;

    // 构建临时 pi 进程
    let mut child = Command::new("pi")
        .arg("--mode").arg("rpc")
        .arg("--agent-dir").arg(&agent_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("spawn pi 失败: {}", e))?;

    // 取 stdin 和 stdout
    let mut stdin = child.stdin.take()
        .ok_or_else(|| "无法获取 stdin".to_string())?;
    let stdout = child.stdout.take()
        .ok_or_else(|| "无法获取 stdout".to_string())?;

    // 发送 list_models 命令
    let cmd_json = serde_json::json!({
        "command": "list_models",
        "api_type": api_type,
        "api_key": api_key,
        "base_url": base_url,
    });

    let json_line = format!("{}\n", cmd_json);
    stdin.write_all(json_line.as_bytes()).await
        .map_err(|e| format!("写入失败: {}", e))?;
    stdin.flush().await
        .map_err(|e| format!("flush 失败: {}", e))?;

    // 丢弃 stdin 以触发 EOF
    drop(stdin);

    // 读取 stdout 响应（超时 30s）
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let result = timeout(Duration::from_secs(30), lines.next_line()).await;

    // kill 子进程
    let _ = child.kill().await;

    match result {
        Ok(Ok(Some(_line))) => {
            // 收到响应即视为连接成功
            Ok(true)
        }
        Ok(Ok(None)) => {
            Err("pi 进程无响应".to_string())
        }
        Ok(Err(e)) => {
            Err(format!("读取响应失败: {}", e))
        }
        Err(_) => {
            Err("连接测试超时（30s）".to_string())
        }
    }
}
