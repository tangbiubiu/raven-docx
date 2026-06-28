// raven-docx/paragraphBuilder.ts — 段落构造与 revisionId 扫描
// Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.2

import { generateHexId } from "./hexId";

// ---- 最小结构类型：只声明 Raven extension 实际读写的字段 ----
// 不 import 上游完整类型（core 是内部包，Raven extension 无法 import）。
// 这些接口覆盖 insert_paragraph 所需的 Paragraph / DocumentBody 形状。

/** tracked change 元数据（w:ins / w:del 属性）。镜像上游 TrackedChangeInfo。 */
type TrackedChangeInfo = {
  id: number;
  author: string;
  date?: string;
};

/** Insertion wrapper（w:ins）—— run 级 tracked insertion。镜像上游 Insertion。 */
type Insertion = {
  type: "insertion";
  info: TrackedChangeInfo;
  content: Array<{
    type: "run";
    content: Array<{ type: "text"; text: string }>;
  }>;
};

/** 段落内联内容（Raven 只产生 Insertion，扫描时遇 Insertion/Deletion）。 */
type InlineContent =
  | Insertion
  | { type: "deletion"; info: TrackedChangeInfo; content: unknown[] }
  | { type: string; content?: unknown[] };

/** 段落格式化的最小字段（仅 styleId）。 */
type ParagraphFormatting = {
  styleId?: string;
};

/** Paragraph 的最小形状（Raven 构造与扫描所需）。 */
export type Paragraph = {
  type: "paragraph";
  paraId?: string;
  formatting?: ParagraphFormatting;
  pPrIns?: TrackedChangeInfo;
  content: InlineContent[];
};

/** DocumentBody 的最小形状（仅 content 数组 + 可选 comments/styles）。 */
export type DocumentBody = {
  content: Paragraph[];
  comments?: unknown[];
};

/** 可选样式定义（hasParagraphStyle 校验用）。 */
type StyleDefinitions = {
  styles?: Array<{ styleId: string; type: string }>;
};

/** 含 package 的 Document（reviewer.toDocument() 返回值的最小形状）。 */
export type Document = {
  package?: {
    document: DocumentBody;
    styles?: StyleDefinitions;
  };
};

// ---- revisionId 扫描（复刻上游 nextRevisionId 的 WeakMap 缓存模式）----
// Reference: .dev/reference/docx-editor/packages/agents/src/changes.ts:315-333

const revisionIdCache = new WeakMap<DocumentBody, number>();

/** 类型守卫：从内联内容提取 tracked change 的 info.id（Insertion/Deletion 共有 info 字段）。 */
function extractTrackedChangeId(item: InlineContent): number | null {
  if (!item || typeof item !== "object" || !("info" in item)) {
    return null;
  }
  const info = item.info;
  if (info && typeof info === "object" && "id" in info) {
    const id = info.id;
    return typeof id === "number" ? id : null;
  }
  return null;
}

/** 扫描 body 内所有段落的 Insertion/Deletion，取 info.id 的 max。无 tracked change 返回 0。 */
function scanMaxRevisionId(body: DocumentBody): number {
  let maxId = 0;
  for (const para of body.content) {
    for (const item of para.content) {
      const id = extractTrackedChangeId(item);
      if (id !== null) {
        maxId = Math.max(maxId, id);
      }
    }
  }
  return maxId;
}

/**
 * 扫描 body 内所有段落的 Insertion/Deletion，取 info.id 的 max+1。
 * 首次扫描后缓存到 WeakMap，后续调用 O(1) 读缓存。
 * 返回的 id 与缓存预留 +1 间隔（replacement 用双 id）。
 */
export function nextRevisionId(body: DocumentBody): number {
  const cached = revisionIdCache.get(body);
  const maxId = cached ?? scanMaxRevisionId(body);
  const next = maxId + 1;
  revisionIdCache.set(body, next + 1);
  return next;
}

// ---- 段落构造 ----

type BuildInsertedParagraphOptions = {
  text: string;
  styleId?: string;
  paraId: string;
  author: string;
  revisionId: number;
  date?: string;
};

/**
 * 构造一个 tracked-insertion 段落：段落标记带 pPrIns，内容 run 带 Insertion wrapper。
 * 这是 Word 表达"新增整段为 tracked change"的标准 OOXML 机制。
 * Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.2
 */
export function buildInsertedParagraph(
  options: BuildInsertedParagraphOptions
): Paragraph {
  const info: TrackedChangeInfo = options.date
    ? { id: options.revisionId, author: options.author, date: options.date }
    : { id: options.revisionId, author: options.author };

  return {
    type: "paragraph",
    paraId: options.paraId,
    formatting: options.styleId ? { styleId: options.styleId } : {},
    pPrIns: info,
    content: [
      {
        type: "insertion",
        info,
        content: [
          { type: "run", content: [{ type: "text", text: options.text }] },
        ],
      },
    ],
  };
}

// ---- 校验辅助 ----

/** 校验 styleId 是否存在于文档样式定义（参考上游 hasParagraphStyle）。 */
export function hasParagraphStyle(
  styles: StyleDefinitions | undefined,
  styleId: string
): boolean {
  if (!styles) {
    return true;
  }
  return !!styles.styles?.some(
    (style) => style.styleId === styleId && style.type === "paragraph"
  );
}

/**
 * 扫描 body 内已有 paraId，生成不冲突的唯一 paraId。
 * 用 generateHexId（上游同款范围/大小写/补零）。
 */
export function generateUniqueParaId(body: DocumentBody): string {
  const seen = new Set<string>();
  for (const para of body.content) {
    if (para.paraId) {
      seen.add(para.paraId);
    }
  }
  let id = generateHexId();
  while (seen.has(id)) {
    id = generateHexId();
  }
  return id;
}

/** 在 body.content 中找到 paraId 对应段落及其在数组中的位置。 */
export function findParagraphIndex(
  body: DocumentBody,
  paraId: string
): { para: Paragraph; pos: number } | null {
  for (let i = 0; i < body.content.length; i++) {
    const para = body.content[i];
    if (para.paraId === paraId || String(i) === paraId) {
      return { para, pos: i };
    }
  }
  return null;
}
