// raven-docx/paragraphBuilder.ts — 段落构造与 revisionId 扫描
// Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.2
// Reference: .dev/plan/2026-06-29-insert-paragraph-table-crash-fix.md §3.2

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

/** Table 行的最小形状（仅 cells，walker 递归用）。 */
type TableRow = {
  cells: Array<{ content: BlockContent[] }>;
};

/** Table block 的最小形状（仅 rows，walker 递归用）。 */
export type Table = {
  type: "table";
  rows: TableRow[];
};

/** BlockSdt 的最小形状（content 为嵌套 BlockContent[]，walker 递归用）。 */
export type BlockSdt = {
  type: "blockSdt";
  content: BlockContent[];
};

/** Body 顶级 block：段落、表格、块级 SDT。镜像上游 BlockContent 联合。 */
export type BlockContent = Paragraph | Table | BlockSdt;

/** DocumentBody 的最小形状（content 为混合 BlockContent[] + 可选 comments/styles）。 */
export type DocumentBody = {
  content: BlockContent[];
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

/**
 * 遍历 body 内所有 paragraph（含 table cell 内），按 document-wide paragraph index 顺序回调。
 * index 语义对齐上游 forEachParagraph（utils.ts:98-123, countOther=true）：
 * top-level paragraph 与 table cell paragraph 共享同一递增 index；
 * blockSdt 不递归其 content，仅推进 index（对齐上游 walkParagraphs 的 countOther 分支）。
 *
 * 注意：上游 walkParagraphs 对 blockSdt 不递归 content，仅 countOther++。
 * 此处保持一致——blockSdt 内段落不参与 paraId 映射（与上游 reviewerBridge 行为一致）。
 */
function forEachParagraph(
  body: DocumentBody,
  fn: (para: Paragraph, index: number) => void | boolean
): void {
  let index = 0;
  for (const block of body.content) {
    if (block.type === "paragraph") {
      if (fn(block, index) === false) return;
      index++;
    } else if (block.type === "table") {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          for (const cellBlock of cell.content) {
            if (cellBlock.type === "paragraph") {
              if (fn(cellBlock, index) === false) return;
              index++;
            }
          }
        }
      }
    } else {
      // blockSdt 及未知 block：推进 index（对齐上游 countOther=true）
      index++;
    }
  }
}

/** 扫描 body 内所有 paragraph（含 table cell）的 Insertion/Deletion，取 info.id 的 max。无 tracked change 返回 0。 */
function scanMaxRevisionId(body: DocumentBody): number {
  let maxId = 0;
  forEachParagraph(body, (para) => {
    for (const item of para.content) {
      const id = extractTrackedChangeId(item);
      if (id !== null) {
        maxId = Math.max(maxId, id);
      }
    }
  });
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
 * 扫描 body 内已有 paraId（含 table cell），生成不冲突的唯一 paraId。
 * 用 generateHexId（上游同款范围/大小写/补零）。
 */
export function generateUniqueParaId(body: DocumentBody): string {
  const seen = new Set<string>();
  forEachParagraph(body, (para) => {
    if (para.paraId) {
      seen.add(para.paraId);
    }
  });
  let id = generateHexId();
  while (seen.has(id)) {
    id = generateHexId();
  }
  return id;
}

/** findParagraphIndex 返回值：定位到的段落 + top-level 插入位置。 */
type FindResult = {
  para: Paragraph;
  /** 新段落应插入的 top-level body.content 位置（splice 用）。 */
  insertPos: number;
  /** 锚点段落所在位置类型。 */
  location: "top-level" | "table-cell";
};

/**
 * 在 body 内找到 paraId 对应段落（含 table cell）。
 * - paraId 匹配：按 w14:paraId 精确匹配（8-hex-digit，上游同款）。
 * - index fallback：按 document-wide paragraph index（对齐上游 reviewerBridge buildParaIdMap）。
 *
 * 返回新段落应插入的 top-level body.content 位置：
 * - 锚点在 top-level paragraph：插入该 paragraph 之后（insertPos = block index + 1）。
 * - 锚点在 table cell：返回 location="table-cell"，insertPos = 该 table block 之后。
 *   调用方（insert_paragraph）应对 table-cell 锚点返回明确错误（§3.3）。
 */
export function findParagraphIndex(
  body: DocumentBody,
  paraId: string
): FindResult | null {
  // 1. document-wide paragraph index fallback
  //    对齐上游 buildParaIdMap：paraId-less paragraph 标记为 [<index>]，
  //    index 是 forEachParagraph 的 document-wide 计数。
  let paraIndex = 0;
  let foundByIndex:
    | { para: Paragraph; blockIndex: number; location: "top-level" | "table-cell" }
    | null = null;

  for (let blockIdx = 0; blockIdx < body.content.length; blockIdx++) {
    const block = body.content[blockIdx];
    if (block.type === "paragraph") {
      if (block.paraId === paraId) {
        return { para: block, insertPos: blockIdx + 1, location: "top-level" };
      }
      if (String(paraIndex) === paraId) {
        foundByIndex = { para: block, blockIndex: blockIdx, location: "top-level" };
      }
      paraIndex++;
    } else if (block.type === "table") {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          for (const cellBlock of cell.content) {
            if (cellBlock.type === "paragraph") {
              if (cellBlock.paraId === paraId) {
                // 表格内段落：insertPos 指向 table block 之后
                return { para: cellBlock, insertPos: blockIdx + 1, location: "table-cell" };
              }
              if (String(paraIndex) === paraId) {
                foundByIndex = { para: cellBlock, blockIndex: blockIdx, location: "table-cell" };
              }
              paraIndex++;
            }
          }
        }
      }
    } else {
      // blockSdt / 未知：推进 index（对齐上游 countOther=true）
      paraIndex++;
    }
  }

  if (foundByIndex) {
    return {
      para: foundByIndex.para,
      insertPos: foundByIndex.blockIndex + 1,
      location: foundByIndex.location,
    };
  }
  return null;
}
