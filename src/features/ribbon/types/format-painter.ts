// src/features/ribbon/types/format-painter.ts — 格式刷快照类型
// 格式刷从纯 mark 快照扩展为「文本格式 + 段落格式(可选)」。
// Reference: .dev/plan/2026-06-25-format-painter-redesign.md §3.1
import type { Alignment } from "@/features/formatting/constants";

/** 字体族结构(与 FormatState.fontFamily 对齐,保留 eastAsia/CJK)
 * 注意:不含 hAnsi——FormatState 只采集 ascii+eastAsia。
 * 应用时 hAnsi 由 ascii 派生,无需单独快照。 */
export type FontFamilySnapshot = { ascii?: string; eastAsia?: string } | null;

/** 文本级格式快照(始终复制)/ Text-level format snapshot (always copied) */
export type TextFormatSnapshot = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  superscript: boolean;
  subscript: boolean;
  fontFamily: FontFamilySnapshot; // null=混合,{}=无格式
  fontSize: number; // half-points,0=默认
  textColor: string; // rgb 不带 #,空串=默认
  highlight: string; // 颜色名,空串=无
};

/** 段落级格式快照(仅当源选区段落一致时存在)
 * Present only if source paragraphs are consistent. */
export type ParagraphFormatSnapshot = {
  alignment: Alignment;
  lineSpacing: number; // 倍数
  lineSpacingRule?: string;
  indentLeft: number; // twips
  indentRight: number;
  indentFirstLine: number;
  spaceBefore: number;
  spaceAfter: number;
};

/** 格式刷快照 / Format painter snapshot */
export type FormatPainterSnapshot = {
  /** 文本级格式(始终复制) */
  text: TextFormatSnapshot;
  /** 段落级格式(仅当源选区段落一致时存在);undefined 表示不一致,不复制段落格式 */
  paragraph?: ParagraphFormatSnapshot;
};
