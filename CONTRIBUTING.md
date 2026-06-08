# Contributing

Thank you for your interest in contributing to this project!

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/example/geex-docx.git
   cd geex-docx
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start development:**
   ```bash
   bun tauri dev
   ```

## Package Manager

This project uses **Bun** exclusively. Do not use npm, yarn, or pnpm.

```bash
bun install          # Install dependencies
bun run <script>     # Run scripts
bunx <package>       # Execute packages
bun add <pkg>        # Add dependency
bun add -d <pkg>     # Add dev dependency
```

## Code Quality

Before submitting a PR, ensure your changes pass all checks:

```bash
bun run check        # Lint check (Biome)
bun run typecheck    # TypeScript type checking
bun run test         # Run tests
bun run build        # Build frontend
```

You can auto-fix lint issues with:

```bash
bun run fix
```

## Testing

This project uses [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/).

```bash
bun run test         # Run tests once
bun run test:watch   # Run tests in watch mode
bun run test:ui      # Open Vitest UI
```

### Writing Tests

Tests are located alongside source files with a `.test.tsx` or `.test.ts` extension.

#### Mocking Tauri Commands

Use `mockIPC` from `@tauri-apps/api/mocks` to mock Tauri commands:

```tsx
import { mockIPC } from "@tauri-apps/api/mocks";
import { commands } from "@/lib/bindings";

beforeEach(() => {
  mockIPC((cmd, args) => {
    if (cmd === "plugin:tauri-specta|greet") {
      const { name } = args as { name: string };
      return `Hello, ${name}!`;
    }
  });
});
```

**Important:** tauri-specta wraps results, so return raw values for success or `throw` for errors:

```tsx
// Success - return raw value
if (cmd === "plugin:tauri-specta|greet") {
  return "Hello!";
}

// Error - throw a string
if (cmd === "plugin:tauri-specta|greet") {
  throw "Name cannot be empty";
}
```

See `src/app.test.tsx` for complete examples.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are validated by commitlint via Lefthook.

Format: `type(scope): description`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:
```bash
git commit -m "feat: add dark mode toggle"
git commit -m "fix: resolve crash on startup"
git commit -m "docs: update README with testing section"
```

## Adding Tauri Commands

1. Add the command in `src-tauri/src/commands.rs` with both attributes:
   ```rust
   #[tauri::command]
   #[specta::specta]
   pub fn your_command() -> Result<String, String> {
       Ok("Result".to_string())
   }
   ```

2. Register in `src-tauri/src/lib.rs`:
   ```rust
   collect_commands![commands::greet, commands::your_command]
   ```

3. Restart `bun tauri dev` to regenerate bindings

4. Import and use from `@/lib/bindings`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass (`bun run check && bun run typecheck && bun run test`)
4. Submit a PR with a clear description of your changes

## Project Structure

```
├── src/                    # React frontend
│   ├── components/ui/      # shadcn/ui components
│   ├── lib/                # Utilities and bindings
│   ├── app.tsx             # Main App component
│   └── app.test.tsx        # App tests
│
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri commands
│   │   ├── lib.rs          # App setup and command registration
│   │   └── main.rs         # Entry point
│   └── tauri.conf.json     # Tauri configuration
│
├── scripts/                # Development scripts
└── .github/workflows/      # CI/CD workflows
```

## Questions?

Feel free to open an issue if you have questions or run into problems.
