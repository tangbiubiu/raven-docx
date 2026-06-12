// hooks/useKeyboard.ts — 全局快捷键管理 (Global Keyboard Shortcuts)
// 声明式注册键盘快捷键，支持 meta/ctrl/shift 修饰键
// Reference: .dev/docs/modules/infrastructure.md §5

import { useEffect } from "react";

/**
 * 键盘快捷键定义
 */
export type KeyboardShortcut = {
  /** 按键名（如 "k", "j", "f", "s", "Escape"） */
  key: string;
  /** Cmd (Mac) / Ctrl (Win) */
  metaKey?: boolean;
  /** Ctrl 键 */
  ctrlKey?: boolean;
  /** Shift 键 */
  shiftKey?: boolean;
  /** 快捷键处理函数 */
  handler: () => void;
  /** 禁用此快捷键 */
  disabled?: boolean;
};

/**
 * 检查单个快捷键是否匹配键盘事件
 */
function matchesShortcut(e: KeyboardEvent, s: KeyboardShortcut): boolean {
  if (s.disabled) {
    return false;
  }

  const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
  const metaMatch = s.metaKey ? e.metaKey || e.ctrlKey : true;
  const ctrlMatch = s.ctrlKey ? e.ctrlKey : true;
  const shiftMatch = s.shiftKey ? e.shiftKey : !e.shiftKey;

  return keyMatch && metaMatch && ctrlMatch && shiftMatch;
}

/**
 * 注册全局键盘快捷键。
 * 通过 `disabled` 可动态启用/禁用快捷键。
 *
 * @example
 * ```tsx
 * useKeyboard([
 *   { key: "k", metaKey: true, handler: () => openModal("commandPalette") },
 *   { key: "f", metaKey: true, handler: () => openModal("findReplace") },
 *   { key: "s", metaKey: true, handler: () => saveDocument() },
 *   { key: "Escape", handler: () => closeModal() },
 * ]);
 * ```
 */
export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (matchesShortcut(e, s)) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
