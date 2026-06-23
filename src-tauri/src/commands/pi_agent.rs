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
/// temp_path: 文档临时文件路径（由前端 saveBufferToTemp 获取），None 时 agent 无文档工具
#[command]
#[specta::specta]
pub async fn agent_send(
    app: AppHandle,
    manager: State<'_, AgentManager>,
    prompt: String,
    mode: Option<String>,
    session_id: Option<String>,
    temp_path: Option<String>,
) -> Result<String, String> {
    manager.set_app_handle(app).await;

    // 设置文档临时路径（spawn 时读取作为 RAVEN_DOCX_PATH 环境变量）
    manager.set_doc_temp_path(temp_path.clone()).await;

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
pub async fn agent_test_connection(app: AppHandle) -> Result<bool, String> {
    use crate::pi::test_api_connection;

    test_api_connection(&app).await
}

/// 保存当前文档 buffer 到临时文件，返回临时文件路径。
///
/// agent_send 前由前端调用：先 editorBridge.save() 获取 buffer，
/// 再调此命令写临时文件，路径作为 agent_send 的 temp_path。
/// - original_path 存在且可写 → 原文件旁 `.agent-tmp-<name>.docx`
/// - 否则 → APP_DATA/agent-workspace/ 下
#[command]
#[specta::specta]
pub fn save_buffer_to_temp(
    app: AppHandle,
    buffer: Vec<u8>,
    original_path: Option<String>,
    document_name: Option<String>,
) -> Result<String, String> {
    use std::path::Path;
    use tauri::Manager;

    let temp_path = match original_path.as_deref() {
        Some(p) if is_writable_dir(Path::new(p).parent()) => {
            let dir = Path::new(p).parent().expect("已检查非空");
            let stem = Path::new(p)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "document".to_string());
            dir.join(format!(".agent-tmp-{}.docx", stem))
        }
        _ => {
            let dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("获取 app_data_dir 失败: {}", e))?
                .join("agent-workspace");
            std::fs::create_dir_all(&dir)
                .map_err(|e| format!("创建 agent-workspace 失败: {}", e))?;
            let name = document_name
                .as_deref()
                .map(|n| n.trim_end_matches(".docx").to_string())
                .unwrap_or_else(|| {
                    format!("untitled-{}", chrono::Utc::now().timestamp_millis())
                });
            dir.join(format!("{}.docx", name))
        }
    };

    std::fs::write(&temp_path, &buffer)
        .map_err(|e| format!("写入临时文件失败: {}", e))?;
    Ok(temp_path.to_string_lossy().to_string())
}

/// 从临时文件读取文档 buffer（agent_end 后前端重载文档用）
#[command]
#[specta::specta]
pub fn reload_from_temp(temp_path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&temp_path).map_err(|e| format!("读取临时文件失败: {}", e))
}

/// 关闭 pi 进程（文档切换/关闭时调用，清理 agent 状态）
#[command]
#[specta::specta]
pub async fn agent_shutdown(manager: State<'_, AgentManager>) -> Result<(), String> {
    manager.shutdown().await
}

/// 检查路径父目录是否可写（粗略判断：存在且是目录）
fn is_writable_dir(dir: Option<&std::path::Path>) -> bool {
    match dir {
        Some(d) => d.is_dir(),
        None => false,
    }
}
