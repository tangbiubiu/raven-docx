# Raven

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

English | [简体中文](./README.md)

An agent-native Word editor built on [docx-editor](https://www.npmjs.com/package/@eigenpal/docx-editor-react). Chat with a coding agent to draft, revise, and restructure `.docx` documents — no formatting gymnastics required.

## Features

- **Agent-native** — Send a prompt, the agent edits the document in place via RPC.
- **Faithful `.docx` round-trip** — Preserves styles, tables, and page layout on load and save.
- **Session persistence** — Each document gets a stable session-id; resume context across restarts.
- **Auto-save & versioning** — Background save with crash recovery and idle-timeout cleanup.
- **Cross-platform** — Native desktop app for macOS, Windows, and Linux via Tauri.

## Usage

### Prerequisites

- [Rust](https://rustup.rs/) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [Bun](https://bun.sh/) — `curl -fsSL https://bun.sh/install | bash`
- Platform deps — see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
bun install          # Install dependencies
bun tauri dev        # Run app (regenerates bindings)
bun tauri build      # Production build
```

### Common scripts

| Command | Description |
|---|---|
| `bun run check` | Lint check (Biome) |
| `bun run typecheck` | TypeScript type checking |
| `bun run test` | Run tests |

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui |
| Backend | Rust + Tauri v2 |
| Type safety | tauri-specta (auto-generated bindings) |
| Agent runtime | `pi` coding agent via RPC subprocess (stdio) |
| State | Zustand |
| Tooling | Bun, Biome (ultracite), Lefthook, commitlint, Vitest |

## License

Apache-2.0 © Raven contributors.

This project depends on [`@eigenpal/docx-editor`](https://docx-editor.dev/) packages, licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
