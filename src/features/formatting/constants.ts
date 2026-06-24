// constants.ts — 共享格式常量 / Shared formatting constants
// 供 Ribbon 各标签页和旧 Toolbar 共用。
// 从 toolbar.tsx 提取。

export const TEXT_MARKS: {
  key: string;
  i18n: string;
  markName: string;
}[] = [
  { key: "bold", i18n: "format.bold", markName: "bold" },
  { key: "italic", i18n: "format.italic", markName: "italic" },
  { key: "underline", i18n: "format.underline", markName: "underline" },
  { key: "strikethrough", i18n: "format.strikethrough", markName: "strike" },
];

export const SUPER_SUB_MARKS: {
  key: string;
  i18n: string;
  markName: string;
}[] = [
  { key: "superscript", i18n: "format.superscript", markName: "superscript" },
  { key: "subscript", i18n: "format.subscript", markName: "subscript" },
];

export const HEADING_OPTIONS = [
  { value: "paragraph", i18n: "format.normal" },
  { value: "heading1", i18n: "format.heading1" },
  { value: "heading2", i18n: "format.heading2" },
  { value: "heading3", i18n: "format.heading3" },
  { value: "heading4", i18n: "format.heading4" },
  { value: "heading5", i18n: "format.heading5" },
  { value: "heading6", i18n: "format.heading6" },
];

export const ALIGNMENTS: {
  key: string;
  i18n: string;
  alignment: string;
}[] = [
  { key: "alignLeft", i18n: "format.alignLeft", alignment: "left" },
  { key: "alignCenter", i18n: "format.alignCenter", alignment: "center" },
  { key: "alignRight", i18n: "format.alignRight", alignment: "right" },
  { key: "alignJustify", i18n: "format.alignJustify", alignment: "justify" },
];

/** 字体列表 — font 字段为单一字体名(对应 OOXML w:ascii),优先选 docx-editor-core 字体表中有 Google 等价的字体 */
export const FONT_FAMILIES = [
  { value: "default", label: "系统默认", font: "" },
  { value: "calibri", label: "Calibri", font: "Calibri" },
  { value: "arial", label: "Arial", font: "Arial" },
  { value: "times", label: "Times New Roman", font: "Times New Roman" },
  { value: "georgia", label: "Georgia", font: "Georgia" },
  { value: "courier", label: "Courier New", font: "Courier New" },
  { value: "cambria", label: "Cambria", font: "Cambria" },
];

/** 字号列表（半磅） */
export const FONT_SIZES = [
  10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72,
];
