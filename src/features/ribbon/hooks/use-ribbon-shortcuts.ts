// src/features/ribbon/hooks/use-ribbon-shortcuts.ts — Ribbon 全局快捷键(仅编辑器未覆盖项)/ Ribbon global shortcuts
//
// 调研结论:@eigenpal/docx-editor-core 内部已绑定 Mod-b/i/u/y/z(加粗/斜体/下划线/重做/撤销)。
// 本 hook 只绑定编辑器未覆盖的快捷键,避免重复绑定导致幽灵 bug。
//
// 已覆盖(编辑器内置,本 hook 不重复):
//   Cmd+B 加粗 / Cmd+I 斜体 / Cmd+U 下划线 / Cmd+Z 撤销 / Cmd+Shift+Z 重做
//
// 本 hook 绑定:
//   Cmd+\   清除格式
//   Cmd+]   增加缩进
//   Cmd+[   减少缩进
//   Cmd+Shift+7  有序列表(用 e.code 避免 Shift+数字的符号映射问题)
//   Cmd+Shift+8  无序列表
import { useEffect } from "react";
import {
  execIndent,
  execOutdent,
  execWrapIn,
} from "@/features/editor/commands";
import { clearFormatting } from "@/features/formatting/format-apply";

/** 无 Shift 修饰的快捷键映射(e.code → 执行函数)/ no-shift shortcut map */
const NO_SHIFT_SHORTCUTS: Record<string, () => void> = {
  Backslash: clearFormatting,
  BracketRight: execIndent,
  BracketLeft: execOutdent,
};

/** Shift 修饰的快捷键映射(e.code → 执行函数)/ shift shortcut map */
const SHIFT_SHORTCUTS: Record<string, () => void> = {
  Digit7: () => execWrapIn("ordered_list"),
  Digit8: () => execWrapIn("bullet_list"),
};

export function useRibbonShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        return;
      }

      const handler = e.shiftKey
        ? SHIFT_SHORTCUTS[e.code]
        : NO_SHIFT_SHORTCUTS[e.code];
      if (!handler) {
        return;
      }

      e.preventDefault();
      handler();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
