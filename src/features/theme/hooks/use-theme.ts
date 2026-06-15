// theme/hooks/useTheme.ts — 暗色模式 Hook
// 切换 document.documentElement 上的 "dark" 类。
// Reference: .dev/proto/workspace.html (dark mode toggle)

import { useCallback, useEffect, useState } from "react";

const DARK_CLASS = "dark";
const STORAGE_KEY = "geex-docx-theme";

type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // localStorage 不可用
  }
  return "light";
}

function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add(DARK_CLASS);
  } else {
    root.classList.remove(DARK_CLASS);
  }
}

/**
 * 暗色模式切换 hook。
 * 初始化时从 localStorage 读取偏好，切换时持久化。
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // 初始化应用 class
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage 不可用
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme,
  };
}
