# Raven · 睿文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An agent-native Word editor built on [docx-editor](https://www.npmjs.com/package/@eigenpal/docx-editor-react). Chat with a coding agent to draft, revise, and restructure `.docx` documents — no formatting gymnastics required.

基于 [docx-editor](https://www.npmjs.com/package/@eigenpal/docx-editor-react) 构建的 agent 原生 Word 编辑器。通过对话驱动 AI agent 完成起草、修订、重构 `.docx` 文档——无需手动排版。

## Features · 主要特点

- **Agent-native · 对话即编辑** — Send a prompt, the agent edits the document in place via RPC. 发送指令，agent 通过 RPC 直接修改文档。
- **Faithful `.docx` round-trip · 忠实读写** — Preserves styles, tables, and page layout on load and save. 加载与保存时保留样式、表格与页面布局。
- **Session persistence · 会话持久化** — Each document gets a stable session-id; resume context across restarts. 每个文档拥有稳定 session-id，重启后可恢复上下文。
- **Auto-save & versioning · 自动保存与版本** — Background save with crash recovery and idle-timeout cleanup. 后台保存，崩溃恢复，空闲超时自动清理进程。
- **Cross-platform · 跨平台** — Native desktop app for macOS, Windows, and Linux via Tauri. 基于 Tauri 的原生桌面应用，支持 macOS、Windows、Linux。

## Usage · 使用方法

### Prerequisites · 前置依赖

- [Rust](https://rustup.rs/) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [Bun](https://bun.sh/) — `curl -fsSL https://bun.sh/install | bash`
- Platform deps · 平台依赖 — see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development · 开发

```bash
bun install          # Install dependencies · 安装依赖
bun tauri dev        # Run app (regenerates bindings) · 启动应用（重新生成类型绑定）
bun tauri build      # Production build · 生产构建
```

### Common scripts · 常用脚本

| Command · 命令 | Description · 说明 |
|---|---|
| `bun run check` | Lint check (Biome) · Lint 检查 |
| `bun run typecheck` | TypeScript type checking · 类型检查 |
| `bun run test` | Run tests · 运行测试 |

## Tech Stack · 技术路线

| Layer · 层 | Choice · 选型 |
|---|---|
| Frontend · 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui |
| Backend · 后端 | Rust + Tauri v2 |
| Type safety · 类型安全 | tauri-specta (auto-generated bindings · 自动生成类型绑定) |
| Agent runtime · Agent 运行时 | `pi` coding agent via RPC subprocess (stdio) · 通过 stdio RPC 子进程 |
| State · 状态管理 | Zustand |
| Tooling · 工具链 | Bun, Biome (ultracite), Lefthook, commitlint, Vitest |

## License

MIT
