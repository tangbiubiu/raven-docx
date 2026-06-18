# Raven

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A docx desktop application

## Features

- **React 19** with React Compiler enabled (automatic memoization)
- **Tauri v2** for secure, lightweight native desktop apps
- **tauri-specta** for fully typesafe Tauri command bindings
- **Vite 7** for lightning-fast development
- **Tailwind CSS v4** with oklch color space
- **shadcn/ui** components (Button, Input included)
- **Biome** for linting and formatting (via ultracite)
- **Lefthook** pre-commit hooks with commitlint
- **Bun** as package manager

## Prerequisites

Before you begin, ensure you have the following installed:

- **Rust** - Install via [rustup](https://rustup.rs/)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

- **Bun** - Install from [bun.sh](https://bun.sh/)
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Platform-specific dependencies** - See [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

  <details>
  <summary>macOS</summary>

  ```bash
  xcode-select --install
  ```
  </details>

  <details>
  <summary>Linux (Debian/Ubuntu)</summary>

  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```
  </details>

  <details>
  <summary>Windows</summary>

  Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
  </details>

## Project Structure

```
├── src/                    # React frontend
│   ├── components/ui/      # shadcn/ui components
│   ├── lib/                # Utility functions
│   │   ├── bindings.ts     # Auto-generated Tauri bindings (gitignored)
│   │   ├── logger.ts       # Logging utilities
│   │   └── utils.ts        # General utilities
│   ├── assets/             # Static assets
│   ├── app.tsx             # Main App component
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles + Tailwind
│
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tauri commands
│   │   └── main.rs         # Entry point
│   ├── capabilities/       # Security capabilities
│   ├── icons/              # App icons
│   └── tauri.conf.json     # Tauri configuration
│
├── scripts/                # Development scripts
│   └── start-dev.ts        # Dev server launcher
│
└── public/                 # Static public assets
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun tauri dev` | Start Tauri in development mode |
| `bun tauri build` | Build production app |
| `bun run check` | Run linter |
| `bun run test` | Run tests |
| `bun run typecheck` | TypeScript type checking |

Run `bun run` to see all available scripts.

## Adding shadcn/ui Components

This template uses [shadcn/ui](https://ui.shadcn.com/) with the **new-york** style. To add more components:

```bash
bunx shadcn@latest add [component-name]
```

Example:
```bash
bunx shadcn@latest add dialog
bunx shadcn@latest add dropdown-menu
```

## Calling Rust from React

This template uses [tauri-specta](https://github.com/oscartbeaumont/tauri-specta) for fully typesafe Tauri commands. TypeScript bindings are auto-generated to `src/lib/bindings.ts` when running `bun tauri dev`.

Define commands in `src-tauri/src/commands.rs`:

```rust
#[tauri::command]
#[specta::specta]  // Required for type generation
pub fn greet(name: &str) -> Result<String, String> {
    Ok(format!("Hello, {}!", name))
}
```

Call from React using the generated bindings:

```tsx
import { commands } from "@/lib/bindings";

const result = await commands.greet("World");

if (result.status === "ok") {
  console.log(result.data); // "Hello, World!"
} else {
  console.error(result.error);
}
```

The `Result` pattern ensures you always handle both success and error cases at compile time.

To add new commands, see [CONTRIBUTING.md](CONTRIBUTING.md#adding-tauri-commands).

## Logging and Error Tracking

This template includes structured logging via `tauri-plugin-log` with multiple targets (console, log files, webview).

### Using the Logger

In React/TypeScript:
```tsx
import { logger } from "./lib/logger";

logger.debug("Debug message");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
```

In Rust:
```rust
log::debug!("Debug message");
log::info!("Info message");
log::warn!("Warning message");
log::error!("Error message");
```

### Handling Command Errors

Tauri commands use a `Result` pattern for explicit error handling. The generated bindings return a discriminated union:

```tsx
import { commands } from "@/lib/bindings";
import { logError, logger } from "@/lib/logger";

async function callCommand() {
  const result = await commands.greet(name);

  if (result.status === "ok") {
    // Success: result.data is fully typed
    return result.data;
  } else {
    // Error: result.error contains the error message
    logError(new Error(result.error), { command: "greet" });
    return null;
  }
}
```

This ensures error handling is enforced at compile time - you cannot access the data without checking the status first.

## Testing

This template uses [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/):

```bash
bun run test         # Run tests once
bun run test:watch   # Watch mode
bun run test:ui      # Open Vitest UI
```

For mocking Tauri commands in tests, see [CONTRIBUTING.md](CONTRIBUTING.md#mocking-tauri-commands).

### Error Tracking with Sentry

For production error tracking, you can integrate [Sentry](https://sentry.io/) for both Rust (`sentry` crate) and React (`@sentry/react`). See Sentry's [Tauri guide](https://docs.sentry.io/platforms/rust/guides/tauri/) and [React guide](https://docs.sentry.io/platforms/javascript/guides/react/) for setup instructions.

## Building for Production

Build the application for your current platform:

```bash
bun tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Releasing

This template includes automated release workflows using GitHub Actions with [release-please](https://github.com/googleapis/release-please) and [tauri-action](https://github.com/tauri-apps/tauri-action).

### How It Works

1. **Push conventional commits** to `main` (e.g., `feat: add feature`, `fix: bug fix`)
2. **release-please** automatically creates/updates a Release PR with version bumps and changelog
3. **Merge the Release PR** to automatically build for all platforms
4. **Review and publish** the draft GitHub Release

### Setup Required

Before your first release:

1. **Generate an updater keypair:**
   ```bash
   bun tauri signer generate -w ~/.tauri/myapp.key
   ```

2. **Update `src-tauri/tauri.conf.json`:**
   - Set `plugins.updater.pubkey` to your public key contents
   - Update the endpoint URL with your GitHub username/repo:
     ```json
     "endpoints": [
       "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
     ]
     ```

3. **Add GitHub secrets** (Settings > Secrets and variables > Actions):
   - `TAURI_SIGNING_PRIVATE_KEY` - Contents of your private key file
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Password for the key

See [.ruler/RELEASING.md](.ruler/RELEASING.md) for detailed documentation including code signing setup.

### Code Signing (Optional)

By default, macOS code signing is **disabled**. Unsigned apps will show a security warning when users first open them.

To enable code signing for production releases, see the [macOS Code Signing section](.ruler/RELEASING.md#optional-macos-code-signing--notarization) in the releasing documentation.

### Cross-platform builds

The publish workflow automatically builds for macOS (ARM64 & Intel), Windows, and Linux when you merge a Release PR. For manual cross-platform builds, use [Tauri Action](https://github.com/tauri-apps/tauri-action) in GitHub Actions.

## Customization

### Changing App Icons

1. Replace the icons in `src-tauri/icons/`
2. Use [tauri-icon](https://tauri.app/distribute/icons/) to generate all required sizes:
   ```bash
   bunx tauri icon path/to/your-icon.png
   ```

### Theming

Edit CSS variables in `src/index.css` to customize colors. The template uses oklch color space with semantic tokens:

- `--primary`, `--secondary`, `--accent`
- `--muted`, `--destructive`
- `--background`, `--foreground`

Dark mode is supported via the `.dark` class.

## IDE Setup

### VS Code (Recommended)

Install the recommended extensions when prompted, or manually install:
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Zed

Configuration is included in `.zed/settings.json`.

## Troubleshooting

### Rust compilation errors

Ensure Rust is up to date:
```bash
rustup update
```

### WebView issues on Linux

Install the required WebKit dependencies for your distribution. See [Tauri Linux Prerequisites](https://v2.tauri.app/start/prerequisites/#linux).

### Port already in use

The dev server uses port 1420 by default. If it's in use, update `src-tauri/tauri.conf.json`:
```json
"devUrl": "http://localhost:YOUR_PORT"
```
And `vite.config.ts`:
```ts
server: { port: YOUR_PORT }
```

## License

MIT
