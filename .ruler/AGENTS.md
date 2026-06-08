# AGENTS.md

Tauri v2 + React 19 desktop application template with type-safe IPC, auto-updates, and CI/CD.

## Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui
- **Backend**: Rust, Tauri v2, tauri-specta (type-safe bindings)
- **Tooling**: Bun, Biome (via ultracite), Lefthook, commitlint
- **CI/CD**: GitHub Actions, release-please, tauri-action

## Package Manager

Use **Bun** exclusively. Never use npm/npx/yarn/pnpm.

```
bun install          # Install dependencies
bun run <script>     # Run scripts
bunx <package>       # Execute packages
bun add <pkg>        # Add dependency
bun add -d <pkg>     # Add dev dependency
```

## Core Conventions

### React
- React Compiler is enabled - **never use manual memoization** (useMemo, useCallback, memo)
- Named exports for components; default exports only for pages/routes

### Tauri Commands
- Define in `src-tauri/src/commands.rs` with **both** `#[tauri::command]` AND `#[specta::specta]`
- Always return `Result<T, String>` for error handling
- Always validate and sanitize input before processing
- Register in `src-tauri/src/lib.rs` via `collect_commands!`

### Frontend Bindings
- Import from `@/lib/bindings` (auto-generated, gitignored)
- **Always check `result.status` before accessing data**:
  - `result.status === "ok"` → access `result.data`
  - `result.status === "error"` → handle `result.error`

## Verifying Changes

```
bun run check        # Lint check (Biome)
bun run fix          # Auto-fix lint issues
bun run typecheck    # TypeScript type checking
bun run test         # Run tests
bun run build        # TypeScript check + Vite build
bun tauri dev        # Run app (regenerates bindings)
bun tauri build      # Production build
```

## Testing

Tests use **Vitest** + **Testing Library**. Run with `bun run test`.

### Mocking Tauri Commands

Use `mockIPC` from `@tauri-apps/api/mocks` to intercept Tauri commands:

```tsx
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";

beforeEach(() => {
  mockIPC((cmd, args) => {
    if (cmd === "greet") {
      const { name } = args as { name: string };
      return `Hello, ${name}!`;  // Return raw value for success
    }
  });
});

afterEach(() => clearMocks());
```

**Key points:**
- tauri-specta wraps results - return raw values (not `{ status: "ok", data }`)
- Throw strings for errors (they become `{ status: "error", error }`)
- Always mock `plugin:log|log` if using the logger
- See `src/app.test.tsx` for complete examples

## Adding a Tauri Command

1. Add command in `src-tauri/src/commands.rs` with both attributes
2. Register in `src-tauri/src/lib.rs` via `collect_commands![commands::your_command]`
3. Restart `bun tauri dev` to regenerate `src/lib/bindings.ts`
4. Import and use from `@/lib/bindings`

## File References

When implementing patterns, read these authoritative sources:

| Pattern | Reference |
|---------|-----------|
| Tauri command with validation | `src-tauri/src/commands.rs:4` |
| Command registration | `src-tauri/src/lib.rs:9` |
| Calling commands (Result pattern) | `src/app.tsx` |
| Testing with Tauri IPC mocking | `src/app.test.tsx` |
| shadcn/ui component (cva, cn, data-slot) | `src/components/ui/button.tsx` |
| Logger usage | `src/lib/logger.ts` |
| Error boundary | `src/main.tsx:14` |
| Security permissions | `src-tauri/capabilities/default.json` |
| Template setup script | `scripts/setup.ts` |

## Additional Documentation

- **Release workflow**: See `RELEASING.md` in this directory

## Maintaining These Docs

After editing `.ruler/` files, run `bunx @intellectronica/ruler apply` to sync changes to all configured targets.
