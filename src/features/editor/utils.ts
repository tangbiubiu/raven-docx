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

/** 检查文档是否包含表格 */
export function hasTables(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") {
    return false;
  }
  const pkg = (doc as { package?: { document?: { content?: unknown[] } } })
    .package;
  if (!pkg?.document?.content) {
    return false;
  }
  for (const block of pkg.document.content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: string }).type === "table"
    ) {
      return true;
    }
  }
  return false;
}

/** 检查段落块是否包含图片 */
function blockHasImage(block: unknown): boolean {
  if (!block || typeof block !== "object") {
    return false;
  }
  const para = block as ParagraphBlock;
  if (!Array.isArray(para.content)) {
    return false;
  }
  for (const run of para.content) {
    if (run.type === "drawing" || run.type === "image") {
      return true;
    }
  }
  return false;
}

/** 检查文档是否包含图片 */
export function hasImages(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") {
    return false;
  }
  const pkg = (doc as { package?: { document?: { content?: unknown[] } } })
    .package;
  if (!pkg?.document?.content) {
    return false;
  }
  for (const block of pkg.document.content) {
    if (blockHasImage(block)) {
      return true;
    }
  }
  return false;
}

/** 提取文档中可用的段落样式 */
export function extractAvailableStyles(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") {
    return [];
  }
  const pkg = (doc as { package?: { document?: { styles?: unknown[] } } })
    .package;
  if (!pkg?.document?.styles) {
    return [];
  }
  const styles: string[] = [];
  for (const style of pkg.document.styles) {
    if (style && typeof style === "object") {
      const s = style as { id?: string; type?: string };
      if (s.type === "paragraph" && s.id) {
        styles.push(s.id);
      }
    }
  }
  return styles;
}

/** 检测文档中的模板变量（如 {variableName}） */
export function detectVariables(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") {
    return [];
  }
  const pkg = (doc as { package?: { document?: { content?: unknown[] } } })
    .package;
  if (!pkg?.document?.content) {
    return [];
  }
  const variables = new Set<string>();
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  for (const block of pkg.document.content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const para = block as ParagraphBlock;
    const text = extractParagraphText(para);
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }
  }
  return Array.from(variables);
}

/** 统计文档段落数 */
export function countParagraphs(doc: unknown): number {
  if (!doc || typeof doc !== "object") {
    return 0;
  }
  const pkg = (doc as { package?: { document?: { content?: unknown[] } } })
    .package;
  if (!pkg?.document?.content) {
    return 0;
  }
  let count = 0;
  for (const block of pkg.document.content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: string }).type === "paragraph"
    ) {
      count += 1;
    }
  }
  return count;
}
