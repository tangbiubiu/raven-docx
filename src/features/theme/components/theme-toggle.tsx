// theme/components/theme-toggle.tsx — 暗色模式切换按钮
// Reference: .dev/proto/workspace.html (dark mode button)

import { useTheme } from "../hooks/use-theme";

/**
 * 暗色模式切换按钮。
 * 在亮色模式显示 🌙，在暗色模式显示 ☀️。
 */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      aria-label={isDark ? "切换到亮色模式" : "切换到暗色模式"}
      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      data-testid="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "亮色模式" : "暗色模式"}
      type="button"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
