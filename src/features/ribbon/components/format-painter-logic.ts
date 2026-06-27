// src/features/ribbon/components/format-painter-logic.ts
// 格式刷采集与应用逻辑(纯函数,无 React 依赖)
// Reference: .dev/plan/2026-06-25-format-painter-redesign.md §3.2-3.6

import {
  alignCenter,
  alignJustify,
  alignLeft,
  alignRight,
  clearFontFamily,
  clearFontSize,
  clearHighlight,
  clearTextColor,
  createRemoveMarkCommand,
  createSetMarkCommand,
  setFontSize,
  setHighlight,
  setIndentFirstLine,
  setIndentLeft,
  setIndentRight,
  setLineSpacing,
  setSpaceAfter,
  setSpaceBefore,
  setTextColor,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import type { MarkType } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { applyBatch } from "@/features/editor/commands";
import type { Alignment } from "@/features/formatting/constants";
import type {
  FormatPainterSnapshot,
  LineSpacingRule,
  ParagraphFormatSnapshot,
} from "@/features/ribbon/types/format-painter";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** 布尔 mark 字段 → mark 名称 / Boolean mark field → mark name */
const BOOL_MARKS: {
  field:
    | "bold"
    | "italic"
    | "underline"
    | "strike"
    | "superscript"
    | "subscript";
  markName: string;
}[] = [
  { field: "bold", markName: "bold" },
  { field: "italic", markName: "italic" },
  { field: "underline", markName: "underline" },
  { field: "strike", markName: "strike" },
  { field: "superscript", markName: "superscript" },
  { field: "subscript", markName: "subscript" },
];

/** 内部对齐值 → 库专用对齐 Command 映射(与 commands.ts 同源) */
const ALIGNMENT_COMMANDS: Record<Alignment, Command> = {
  left: alignLeft,
  center: alignCenter,
  right: alignRight,
  justify: alignJustify,
};

/** 已知内部对齐值查表(归一化 'both' → 'justify') */
const KNOWN_ALIGNMENTS: Record<string, true> = {
  left: true,
  center: true,
  right: true,
  justify: true,
};

/** 将库 ParagraphAlignment 归一化为内部对齐值('both' → 'justify',未知 → undefined) */
function normalizeAlignment(a: string | undefined): Alignment | undefined {
  if (a === "both") {
    return "justify";
  }
  if (a && KNOWN_ALIGNMENTS[a]) {
    return a as Alignment;
  }
  return;
}

/** 格式刷快照的文本格式输入(来自 selectionFormat,宽松可选) */
type TextFormatInput = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontFamily?: { ascii?: string; eastAsia?: string } | null;
  fontSize?: number;
  textColor?: string;
  highlight?: string;
};

/** EditorView 的最小采集契约(避免依赖完整 prosemirror-view 类型) */
type CollectorView = {
  state: {
    doc: {
      nodesBetween(
        from: number,
        to: number,
        cb: (node: unknown, pos: number) => void
      ): void;
    };
    selection: { from: number; to: number; empty: boolean };
    schema: { marks: Record<string, MarkType> };
  };
};

/** 段落一致性比较的核心字段(§6.3:仅用户可感知的 8 个属性,忽略 tabs/borders 等) */
const PARAGRAPH_COMPARE_KEYS = [
  "alignment",
  "lineSpacing",
  "lineSpacingRule",
  "indentLeft",
  "indentRight",
  "indentFirstLine",
  "spaceBefore",
  "spaceAfter",
] as const;

/**
 * 从选区遍历段落,采集段落格式并判断一致性。
 * 遍历选区内所有顶层 textblock(paragraph/heading),提取 8 个核心段落属性。
 * 全部一致 → 返回 ParagraphFormatSnapshot;任一不同 → 返回 undefined。
 * 对齐用库 getParagraphAlignment 语义归一化('both' → 'justify')。
 */
function collectParagraphFormat(
  view: CollectorView
): ParagraphFormatSnapshot | undefined {
  const { from, to } = view.state.selection;
  const paragraphs: Record<string, unknown>[] = [];

  view.state.doc.nodesBetween(from, to, (node) => {
    const n = node as {
      isTextblock?: boolean;
      attrs?: Record<string, unknown>;
    };
    if (n.isTextblock && n.attrs) {
      paragraphs.push(n.attrs);
    }
  });

  if (paragraphs.length === 0) {
    return;
  }

  const first = paragraphs[0];
  for (let i = 1; i < paragraphs.length; i++) {
    // 任一核心字段不同 → 段落格式不一致,不复制
    if (!PARAGRAPH_COMPARE_KEYS.every((k) => first[k] === paragraphs[i][k])) {
      return;
    }
  }

  // 全部一致,取首段构造快照(对齐归一化)
  const alignment = normalizeAlignment(first.alignment as string | undefined);
  if (alignment === undefined) {
    return;
  }

  return {
    alignment,
    lineSpacing: (first.lineSpacing as number) ?? 1.0,
    lineSpacingRule: first.lineSpacingRule as LineSpacingRule | undefined,
    indentLeft: (first.indentLeft as number) ?? 0,
    indentRight: (first.indentRight as number) ?? 0,
    indentFirstLine: (first.indentFirstLine as number) ?? 0,
    spaceBefore: (first.spaceBefore as number) ?? 0,
    spaceAfter: (first.spaceAfter as number) ?? 0,
  };
}

/**
 * 构造格式刷完整快照:文本格式(始终)+ 段落格式(选区段落一致时)。
 * view 为 null 时仅返回 text 快照(paragraph undefined)。
 */
export function collectFormatPainterSnapshot(
  view: CollectorView | null,
  textFmt: TextFormatInput
): FormatPainterSnapshot {
  const text = {
    bold: textFmt.bold ?? false,
    italic: textFmt.italic ?? false,
    underline: textFmt.underline ?? false,
    strike: textFmt.strike ?? false,
    superscript: textFmt.superscript ?? false,
    subscript: textFmt.subscript ?? false,
    fontFamily: textFmt.fontFamily ?? null,
    fontSize: textFmt.fontSize ?? 0,
    textColor: textFmt.textColor ?? "",
    highlight: textFmt.highlight ?? "",
  };

  if (!view) {
    return { text };
  }

  return {
    text,
    paragraph: collectParagraphFormat(view),
  };
}

/**
 * 构造 fontFamily 命令(合并语义)/ Build font-family command.
 * null → 跳过(null 返回);{} → clearFontFamily;有 ascii/eastAsia →
 * 一次 createSetMarkCommand 合并字段(hAnsi 由 ascii 派生,与库 setFontFamily 语义一致)。
 */
function buildFontFamilyCommand(
  fontFamily: { ascii?: string; eastAsia?: string } | null,
  markType: MarkType | undefined
): Command | null {
  if (fontFamily === null) {
    return null;
  }
  if (!(fontFamily.ascii || fontFamily.eastAsia)) {
    return clearFontFamily;
  }
  if (!markType) {
    return null;
  }
  const attrs: { ascii?: string; hAnsi?: string; eastAsia?: string } = {};
  if (fontFamily.ascii) {
    attrs.ascii = fontFamily.ascii;
    attrs.hAnsi = fontFamily.ascii;
  }
  if (fontFamily.eastAsia) {
    attrs.eastAsia = fontFamily.eastAsia;
  }
  return createSetMarkCommand(markType, attrs);
}

/** 构造文本格式命令数组(设值语义)/ Build text-format commands (set-semantics)。
 * 布尔 mark:true→set,false→remove;fontFamily:null 跳过、{} 清除、有值合并设置;
 * 标量:0/空串→clear,非零/非空→set。 */
function buildTextCommands(
  text: FormatPainterSnapshot["text"],
  schema: { marks: Record<string, MarkType> }
): Command[] {
  const commands: Command[] = [];

  // 布尔 mark:设值语义(true→set,false→remove)
  for (const { field, markName } of BOOL_MARKS) {
    const markType = schema.marks[markName];
    if (!markType) {
      continue;
    }
    commands.push(
      text[field]
        ? createSetMarkCommand(markType)
        : createRemoveMarkCommand(markType)
    );
  }

  // fontFamily:null 跳过;{} 清除;有值 → 合并设置(hAnsi 由 ascii 派生)
  const fontCmd = buildFontFamilyCommand(
    text.fontFamily,
    schema.marks.fontFamily
  );
  if (fontCmd) {
    commands.push(fontCmd);
  }

  // fontSize:0 → clear,>0 → set
  commands.push(text.fontSize > 0 ? setFontSize(text.fontSize) : clearFontSize);

  // textColor:空串 → clear,非空 → set
  commands.push(
    text.textColor ? setTextColor({ rgb: text.textColor }) : clearTextColor
  );

  // highlight:空串 → clear,非空 → set
  commands.push(text.highlight ? setHighlight(text.highlight) : clearHighlight);

  return commands;
}

/** 构造段落格式命令数组(整体应用)/ Build paragraph-format commands。 */
function buildParagraphCommands(
  para: NonNullable<FormatPainterSnapshot["paragraph"]>
): Command[] {
  return [
    ALIGNMENT_COMMANDS[para.alignment],
    setLineSpacing(para.lineSpacing, para.lineSpacingRule),
    setSpaceBefore(para.spaceBefore),
    setSpaceAfter(para.spaceAfter),
    setIndentLeft(para.indentLeft),
    setIndentRight(para.indentRight),
    setIndentFirstLine(para.indentFirstLine),
  ];
}

/**
 * 应用格式刷快照到当前选区(设值语义,单事务)。
 * 文本格式:布尔 mark 先清后设;标量按源值设/清;fontFamily 混合(null)跳过。
 * 段落格式:snapshot.paragraph 存在则应用,undefined 跳过。
 * 全部命令通过 applyBatch 单事务累积,一次 undo。
 */
export function applySnapshot(snapshot: FormatPainterSnapshot): void {
  const bridge = useDocumentStore.getState().editorBridge;
  const view = bridge?.getEditorView();
  if (!view) {
    return;
  }
  const commands = buildTextCommands(snapshot.text, view.state.schema);
  if (snapshot.paragraph) {
    commands.push(...buildParagraphCommands(snapshot.paragraph));
  }
  applyBatch(commands);
}
