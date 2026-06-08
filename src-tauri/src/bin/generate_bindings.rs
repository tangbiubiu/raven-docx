// Binary to generate TypeScript bindings for CI
// Run with: cargo run --bin generate_bindings

mod commands {
    include!("../commands.rs");
}

use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder, ErrorHandlingMode};

fn main() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![commands::greet])
        .error_handling(ErrorHandlingMode::Result);

    builder
        .export(
            Typescript::default().header("// @ts-nocheck"),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    println!("TypeScript bindings generated successfully!");
}
