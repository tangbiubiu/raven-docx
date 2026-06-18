// commands/pi_agent.rs — pi agent Tauri commands
// Provides 5 commands for frontend: agent_spawn / agent_send / agent_abort / agent_get_status / agent_test_connection

use serde::Serialize;
use tauri::{command, AppHandle, State};

use crate::pi::{AgentManager, PiState, SendMode};

/// Agent status response
#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct AgentStatus {
    pub state: String,
    pub session_id: Option<String>,
}

/// Spawn pi agent subprocess (lazy spawn, called automatically on first request)
#[command]
#[specta::specta]
pub async fn agent_spawn(
    app: AppHandle,
    manager: State<'_, AgentManager>,
    session_id: Option<String>,
) -> Result<(), String> {
    manager.set_app_handle(app).await;
    manager.spawn(session_id).await
}

/// Send prompt to pi agent
/// mode: "default" | "steer" | "enqueue"
/// session_id: document hash, None when no document
#[command]
#[specta::specta]
pub async fn agent_send(
    app: AppHandle,
    manager: State<'_, AgentManager>,
    prompt: String,
    mode: Option<String>,
    session_id: Option<String>,
) -> Result<String, String> {
    manager.set_app_handle(app).await;
    
    let current_state = manager.get_state().await;
    if current_state == PiState::NotInstalled || current_state == PiState::Stopped {
        manager.spawn(session_id).await?;
    }
    
    let send_mode = mode
        .as_deref()
        .map(SendMode::from_str)
        .unwrap_or(SendMode::Default);
    
    manager.send_prompt(prompt, send_mode).await
}

/// Abort current Agent operation
#[command]
#[specta::specta]
pub async fn agent_abort(manager: State<'_, AgentManager>) -> Result<(), String> {
    manager.abort().await
}

/// Get Agent process status
#[command]
#[specta::specta]
pub async fn agent_get_status(manager: State<'_, AgentManager>) -> Result<AgentStatus, String> {
    let state = manager.get_state().await;
    let session_id = manager.get_current_session().await;

    Ok(AgentStatus {
        state: state.to_string(),
        session_id,
    })
}

/// Test API connection (temporary spawn pi + get_state)
///
/// 验证 pi 能否正常启动并响应 RPC 命令。
/// pi 使用自身配置（models.json 中的 provider/apiKey/baseUrl），
/// 不通过 CLI 参数传递凭证。
#[command]
#[specta::specta]
pub async fn agent_test_connection() -> Result<bool, String> {
    use crate::pi::test_api_connection;

    test_api_connection().await
}
