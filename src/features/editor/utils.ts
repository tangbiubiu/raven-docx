// features/editor/utils.ts — 编辑器工具函数 (Editor Utilities)
// 文档结构提取、标题识别等纯函数

import type { OutlineItem } from "@/stores/useDocumentStore";

/** 段落块类型（@eigenpal/docx-editor-core DocumentBody.content 元素） */
type ParagraphBlock = {
  type?: string;
  paraId?: string;
  formatting?: { outlineLevel?: number };
  content?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

/** 提取段落中的所有文本内容 */
function extractParagraphText(para: ParagraphBlock): string {
  if (!Array.isArray(para.content)) {
    return "";
  }
  let text = "";
  for (const run of para.content) {
    if (run.type === "run" && Array.isArray(run.content)) {
      for (const node of run.content) {
        if (node.type === "text" && node.text) {
          text += node.text;
        }
      }
    }
  }
  return text;
}

/** 检查段落是否为有效的标题 */
function isHeadingParagraph(para: ParagraphBlock): boolean {
  if (para.type !== "paragraph") {
    return false;
  }
  if (!para.formatting || para.formatting.outlineLevel === undefined) {
    return false;
  }
  if (!para.paraId) {
    return false;
  }
  return extractParagraphText(para).length > 0;
}

/** 从文档中提取所有标题（outlineLevel 存在的段落） */
export function extractHeadings(doc: unknown): OutlineItem[] {
  if (!doc || typeof doc !== "object") {
    return [];
  }
  const pkg = (doc as { package?: { document?: { content?: unknown[] } } })
    .package;
  if (!pkg?.document?.content) {
    return [];
  }
  const items: OutlineItem[] = [];
  for (const block of pkg.document.content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const para = block as ParagraphBlock;
    if (!isHeadingParagraph(para)) {
      continue;
    }
    items.push({
      paraId: para.paraId || "",
      text: extractParagraphText(para),
      level: para.formatting?.outlineLevel ?? 0,
    });
  }
  return items;
}
