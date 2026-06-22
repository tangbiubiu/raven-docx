# Raven · 睿文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README-EN.md) | 简体中文

基于 [docx-editor](https://www.npmjs.com/package/@eigenpal/docx-editor-react) 构建的 agent 原生 Word 编辑器。通过对话驱动 AI agent 完成起草、修订、重构 `.docx` 文档——无需手动排版。

## 主要特点

- **对话即编辑** — 发送指令，agent 通过 RPC 直接修改文档。
- **忠实读写** — 加载与保存时保留样式、表格与页面布局。
- **会话持久化** — 每个文档拥有稳定 session-id，重启后可恢复上下文。
- **自动保存与版本** — 后台保存，崩溃恢复，空闲超时自动清理进程。
- **跨平台** — 基于 Tauri 的原生桌面应用，支持 macOS、Windows、Linux。

## 使用方法

### 前置依赖

- [Rust](https://rustup.rs/) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [Bun](https://bun.sh/) — `curl -fsSL https://bun.sh/install | bash`
- 平台依赖 — 参阅 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)

### 开发

```bash
bun install          # 安装依赖
bun tauri dev        # 启动应用（重新生成类型绑定）
bun tauri build      # 生产构建
```

### 常用脚本

| 命令 | 说明 |
|---|---|
| `bun run check` | Lint 检查（Biome） |
| `bun run typecheck` | TypeScript 类型检查 |
| `bun run test` | 运行测试 |

## 技术路线

| 层 | 选型 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui |
| 后端 | Rust + Tauri v2 |
| 类型安全 | tauri-specta（自动生成类型绑定） |
| Agent 运行时 | `pi` coding agent，通过 stdio RPC 子进程 |
| 状态管理 | Zustand |
| 工具链 | Bun, Biome (ultracite), Lefthook, commitlint, Vitest |

## 协议

MIT © Raven contributors.

本项目依赖 [`@eigenpal/docx-editor`](https://docx-editor.dev/) 系列包，其遵循 [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) 协议。
