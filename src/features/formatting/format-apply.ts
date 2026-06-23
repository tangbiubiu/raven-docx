// format-apply.ts — 格式应用工具函数 / Format application helpers
// 从 toolbar.tsx 提取,供 Ribbon HomeTab 和旧 Toolbar 共用。
import { useDocumentStore } from "@/stores/useDocumentStore";
import { FONT_FAMILIES } from "./constants";

/** 通过 bridge.applyFormatting 设置字体 */
export function applyFont(fontValue: string): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const family = FONT_FAMILIES.find((f) => f.value === fontValue);
  if (!family) {
    return;
  }

  // 通过 ProseMirror mark 设置字体
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const fontFamilyMark = state.schema.marks.fontFamily;
  if (fontFamilyMark && family.font) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    dispatch(
      state.tr.addMark(from, to, fontFamilyMark.create({ ascii: family.font }))
    );
  }
}

/** 通过 ProseMirror mark 设置字号 */
export function applyFontSize(sizeHalfPt: number): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const fontSizeMark = state.schema.marks.fontSize;
  if (fontSizeMark) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    dispatch(
      state.tr.addMark(from, to, fontSizeMark.create({ size: sizeHalfPt }))
    );
  }
}

/** 通过 ProseMirror mark 设置文字颜色 */
export function applyTextColor(color: string): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const colorMark = state.schema.marks.color;
  if (colorMark) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    // OOXML color uses rgb without #
    const rgb = color.replace("#", "");
    dispatch(state.tr.addMark(from, to, colorMark.create({ rgb })));
  }
}

/** 通过 ProseMirror mark 设置高亮 */
export function applyHighlight(color: string): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const highlightMark = state.schema.marks.highlight;
  if (highlightMark) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    dispatch(state.tr.addMark(from, to, highlightMark.create({ color })));
  }
}

/** 清除选区格式 */
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
