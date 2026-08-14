// editor/commands/styles.ts — 段落样式 (P0: 样式库)/ Paragraph styles
// 经 StyleResolver 解析样式级联后调用库 applyStyle 命令。

import { createStyleResolver } from "@eigenpal/docx-editor-core/prosemirror";
import {
  applyStyle,
  clearStyle,
  getStyleId,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import type { Document } from "@eigenpal/docx-editor-core/types/document";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { apply, getView } from "./shared";

/**
 * 从当前文档构建 StyleResolver（docDefaults → Normal → basedOn 级联）。
 * 无文档或无 styles.xml 时返回 null。
 */
function getDocumentStyleResolver(): ReturnType<
  typeof createStyleResolver
> | null {
  const bridge = useDocumentStore.getState().editorBridge;
  const doc = bridge?.getDocument();
  if (!doc || typeof doc !== "object") {
    return null;
  }
  const styles = (doc as Document).package?.styles;
  return createStyleResolver(styles);
}

/**
 * 应用命名段落样式（如 Heading1/Title/Quote）/ Apply a named paragraph style.
 * 经 StyleResolver 解析样式级联后传入 applyStyle，段落渲染/序列化携带 w:pStyle
 * 与解析出的段落/文字格式（outlineLevel 同步进大纲面板）。
 */
export function execApplyStyle(styleId: string): void {
  const view = getView();
  if (!view) {
    return;
  }
  const resolver = getDocumentStyleResolver();
  const resolved = resolver?.resolveParagraphStyle(styleId);
  apply(applyStyle(styleId, resolved));
}

/** 清除段落样式（回正文）/ Clear paragraph style */
export function execClearStyle(): void {
  apply(clearStyle);
}

/** 当前选区段落的样式 ID / Style ID of the paragraph at the cursor */
export function execGetStyleId(): string | null {
  const view = getView();
  return view ? getStyleId(view.state) : null;
}
