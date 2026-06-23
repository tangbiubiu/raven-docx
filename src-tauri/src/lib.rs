mod commands;
mod pi;

use pi::AgentManager;
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};
use tauri_specta::{collect_commands, Builder, ErrorHandlingMode};


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::file::open_docx,
            commands::file::save_docx,
            commands::file::save_as_docx,
            commands::file::get_recent_files,
            commands::keychain::get_api_key_masked,
            commands::keychain::set_api_key,
            commands::keychain::delete_api_key,
            commands::credentials::sync_credentials_to_pi,
            commands::system::get_system_info,
            commands::pi_agent::agent_spawn,
            commands::pi_agent::agent_send,
            commands::pi_agent::agent_abort,
            commands::pi_agent::agent_get_status,
            commands::pi_agent::agent_test_connection,
            commands::pi_agent::save_buffer_to_temp,
            commands::pi_agent::reload_from_temp,
            commands::pi_agent::agent_shutdown,
        ])
        .error_handling(ErrorHandlingMode::Result);

    builder
        .export(
            Typescript::default().header("// @ts-nocheck"),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AgentManager::new())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            let manager = app_handle.state::<AgentManager>().clone();
            // 创建临时 runtime 阻塞等待优雅退出，避免嵌套 runtime panic
            tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("failed to build shutdown runtime")
                .block_on(async {
                    if let Err(e) = manager.shutdown().await {
                        log::error!("[pi] 关闭 pi 进程失败: {}", e);
                    }
                });
        }
    });
}
