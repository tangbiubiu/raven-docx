// features/page-layout/columns.ts — 分栏数据模型直改 (Columns headless setter)
// 库无公开分栏 setter(capability-audit §6 spike 确认模型原生支持 w:cols):
// 就地修改 Document 的 finalSectionProperties 列字段,由调用方负责
// serializeDocx + updateDocumentXml 回写(见 commands.ts execSetColumns)。

import type { Document } from "@eigenpal/docx-editor-core/types/document";

/** 分栏选项 / Column layout options */
export type ColumnOptions = {
  /** 栏数(1 表示取消分栏)/ column count (1 = single column) */
  columnCount: number;
  /** 栏间距(twips,1pt=20twips;默认 0.75cm≈425)/ column space (twips) */
  columnSpace?: number;
  /** 等宽列 / equal-width columns */
  equalWidth?: boolean;
  /** 栏间分隔线 / separator line between columns */
  separator?: boolean;
};

/** 默认栏间距(0.75cm ≈ 425 twips,Word 常用)/ default column space */
const DEFAULT_COLUMN_SPACE = 425;

/**
 * 把分栏选项写入文档最终节的 SectionProperties(整页分栏)。
 * 就地修改,返回 void;不改动 pageWidth/margins 等其他节字段。
 * columnCount=1 时清除 columns[] 与分隔线,还原单栏。
 */
export function applyColumnsToDoc(doc: Document, opts: ColumnOptions): void {
  const sect = doc.package.document.finalSectionProperties;
  if (!sect) {
    return;
  }
  const { columnCount, equalWidth = true, separator = false } = opts;
  const columnSpace = opts.columnSpace ?? DEFAULT_COLUMN_SPACE;
  sect.columnCount = columnCount;
  sect.columnSpace = columnSpace;
  sect.equalWidth = equalWidth;
  sect.separator = separator;

  if (columnCount <= 1) {
    // 单栏:无列定义、无分隔线
    sect.columns = undefined;
    sect.separator = false;
    return;
  }
  if (equalWidth) {
    // 等宽:无需显式 w:col,Word 按 w:num 均分
    sect.columns = undefined;
    return;
  }
  // 不等宽:无逐栏宽度 UI,按页面可用宽度均分生成显式列宽(合法 OOXML)
  const pageWidth = sect.pageWidth ?? 0;
  const usable = pageWidth - (sect.marginLeft ?? 0) - (sect.marginRight ?? 0);
  const colWidth = Math.max(
    1,
    Math.floor((usable - columnSpace * (columnCount - 1)) / columnCount)
  );
  sect.columns = Array.from({ length: columnCount }, () => ({
    width: colWidth,
    space: columnSpace,
  }));
}
