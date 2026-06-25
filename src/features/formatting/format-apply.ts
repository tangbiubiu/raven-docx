// format-apply.ts — 格式应用工具函数 / Format application helpers
// 薄委派层:将 Ribbon UI 的格式操作委派到 commands.ts 的 exec* 封装,
// 后者调用 docx-editor-core 的 ProseMirror 命令(操作当前选区)。
// Reference: .dev/plan/2026-06-23-ribbon-enhancement.md §Phase 0
import {
  execSetFontFamily,
  execSetFontFamilyEastAsia,
  execSetFontSize,
  execSetHighlight,
  execSetTextColor,
} from "@/features/editor/commands";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { FONT_FAMILIES } from "./constants";

/**
 * 设置字体族 / Set font family (value 来自 FONT_FAMILIES)。
 * 根据 FONT_FAMILIES 项的 script 字段路由:
 * - latin → execSetFontFamily(设 ascii + hAnsi)
 * - cjk → execSetFontFamilyEastAsia(设 eastAsia,保留旧 ascii/hAnsi)
 */
export function applyFont(fontValue: string): void {
  const family = FONT_FAMILIES.find((f) => f.value === fontValue);
  if (!family?.font) {
    return;
  }
  if (family.script === "cjk") {
    execSetFontFamilyEastAsia(family.font);
  } else {
    execSetFontFamily(family.font);
  }
}

/** 设置字号(half-points)/ Set font size */
export function applyFontSize(sizeHalfPt: number): void {
  execSetFontSize(sizeHalfPt);
}

/** 设置文字颜色(自动剥离 # 前缀)/ Set text color */
export function applyTextColor(color: string): void {
  execSetTextColor(color);
}

/** 设置文本高亮(颜色名)/ Set text highlight */
export function applyHighlight(color: string): void {
  execSetHighlight(color);
}

/** 清除选区格式 / Clear formatting */
export function clearFormatting(): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const { from, to, empty } = state.selection;
  if (empty) {
    return;
  }
  // 移除所有 marks
  dispatch(state.tr.removeMark(from, to));
}
