// Binary to generate TypeScript bindings for CI
// Run with: cargo run --bin generate_bindings

#[path = "../commands/mod.rs"]
mod commands;

use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder, ErrorHandlingMode};

fn main() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::file::open_docx,
            commands::file::save_docx,
            commands::file::save_as_docx,
            commands::file::get_recent_files,
            commands::keychain::get_api_key_masked,
            commands::keychain::set_api_key,
            commands::keychain::delete_api_key,
            commands::system::get_system_info,
        ])
        .error_handling(ErrorHandlingMode::Result);

    builder
        .export(
            Typescript::default().header("// @ts-nocheck"),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    println!("TypeScript bindings generated successfully!");
}
