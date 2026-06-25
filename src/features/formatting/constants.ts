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

/** 字体脚本类型 — 决定写入 OOXML 的哪个字段 / Font script type */
export type FontScript = "latin" | "cjk";

/** 字体列表项 / Font family list item */
export type FontFamilyItem = {
  value: string;
  label: string;
  font: string;
  script: FontScript;
};

/**
 * 字体列表 — font 字段为单一字体名。
 * - latin 字体写入 OOXML w:ascii + w:hAnsi
 * - cjk 字体写入 OOXML w:eastAsia
 * 优先选 docx-editor-core 字体表中有 Google 等价的字体。
 */
export const FONT_FAMILIES: FontFamilyItem[] = [
  { value: "default", label: "系统默认", font: "", script: "latin" },
  { value: "calibri", label: "Calibri", font: "Calibri", script: "latin" },
  { value: "arial", label: "Arial", font: "Arial", script: "latin" },
  {
    value: "times",
    label: "Times New Roman",
    font: "Times New Roman",
    script: "latin",
  },
  { value: "georgia", label: "Georgia", font: "Georgia", script: "latin" },
  {
    value: "courier",
    label: "Courier New",
    font: "Courier New",
    script: "latin",
  },
  { value: "cambria", label: "Cambria", font: "Cambria", script: "latin" },
  // CJK 字体（写入 w:eastAsia）/ CJK fonts (written to w:eastAsia)
  { value: "simsun", label: "宋体", font: "SimSun", script: "cjk" },
  { value: "simhei", label: "黑体", font: "SimHei", script: "cjk" },
  { value: "msyh", label: "微软雅黑", font: "Microsoft YaHei", script: "cjk" },
  { value: "kaiti", label: "楷体", font: "KaiTi", script: "cjk" },
  { value: "fangsong", label: "仿宋", font: "FangSong", script: "cjk" },
  { value: "dengxian", label: "等线", font: "DengXian", script: "cjk" },
  { value: "pingfang", label: "苹方", font: "PingFang SC", script: "cjk" },
  { value: "stsong", label: "华文宋体", font: "STSong", script: "cjk" },
  { value: "stkaiti", label: "华文楷体", font: "STKaiti", script: "cjk" },
  { value: "stheiti", label: "华文黑体", font: "STHeiti", script: "cjk" },
  {
    value: "noto-serif-sc",
    label: "思源宋体",
    font: "Noto Serif SC",
    script: "cjk",
  },
  {
    value: "noto-sans-sc",
    label: "思源黑体",
    font: "Noto Sans SC",
    script: "cjk",
  },
];

/** 字号列表（半磅） */
export const FONT_SIZES = [
  10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72,
];
