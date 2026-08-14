// editor/commands/paragraph.ts — 段落:块类型、对齐、列表、缩进、行距/段距/缩进
// 基于 prosemirror-commands / docx-editor-core PM 命令的 exec* 纯函数封装。

import {
  alignCenter,
  alignJustify,
  alignLeft,
  alignRight,
  decreaseIndent,
  decreaseListLevel,
  increaseIndent,
  increaseListLevel,
  isInList,
  removeList,
  setIndentFirstLine,
  setIndentLeft,
  setIndentRight,
  setLineSpacing,
  setSpaceAfter,
  setSpaceBefore,
  toggleBulletList,
  toggleNumberedList,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import { setBlockType } from "prosemirror-commands";

import type { Command } from "prosemirror-state";
import type { Alignment } from "@/features/formatting/constants";
import { apply, getView } from "./shared";

// === Block 类型 ===

/** 设置块类型（heading/paragraph/code_block 等） */
export function execSetBlockType(
  nodeName: string,
  attrs?: Record<string, unknown>
): void {
  const view = getView();
  if (!view) {
    return;
  }
  const node = view.state.schema.nodes[nodeName];
  if (!node) {
    return;
  }
  // paragraph 与 heading 统一路径:透传 attrs(或 null)给 setBlockType。
  // 注意:setBlockType 会整体替换节点 attrs,缺失属性填 schema 默认值;
  // 段落对齐请用 execSetAlignment(库专用命令,正确合并属性)。
  setBlockType(node, attrs ?? null)(view.state, view.dispatch);
}

// === Paragraph alignment / 段落对齐 ===

/** 内部对齐值 → 库专用对齐 Command 映射 */
const ALIGNMENT_COMMANDS: Record<Alignment, Command> = {
  left: alignLeft,
  center: alignCenter,
  right: alignRight,
  justify: alignJustify,
};

/**
 * 设置段落对齐 / Set paragraph alignment.
 * 使用库专用对齐命令(alignLeft/alignCenter/alignRight/alignJustify),
 * 这些命令正确合并段落属性,不会覆盖缩进/行距等其他属性。
 * 注意:内部对齐值 "justify" 对应库的 alignJustify(库底层用 "both")。
 */
export function execSetAlignment(alignment: Alignment): void {
  apply(ALIGNMENT_COMMANDS[alignment]);
}

// === 列表 (P1: 库真实命令,替代弱命令 wrapIn/lift) ===
// 本 schema 无 ordered_list/bullet_list/list_item 节点——列表是段落的 numPr 属性。
// 旧 wrapIn/lift/sinkListItem/liftListItem 因节点不存在而静默 no-op;
// 库 toggleBulletList/toggleNumberedList 按 numId 语义切换,并负责退出列表。

/** 切换有序列表(在列表中则退出)/ Toggle numbered list */
export function execToggleNumberedList(): void {
  apply(toggleNumberedList);
}

/** 切换无序列表(在列表中则退出)/ Toggle bullet list */
export function execToggleBulletList(): void {
  apply(toggleBulletList);
}

/** 列表项降一级(仅列表内生效)/ Increase list level (list item only) */
export function execIncreaseListLevel(): void {
  apply(increaseListLevel);
}

/** 列表项升一级(一级时退出列表)/ Decrease list level (exits list at level 0) */
export function execDecreaseListLevel(): void {
  apply(decreaseListLevel);
}

/** 取消选中段落的列表格式 / Remove list formatting from selection */
export function execRemoveList(): void {
  apply(removeList);
}

// === 缩进 ===

/**
 * 增加缩进 / Increase indent.
 * 列表内 → 降一级(与 WPS/Word 及库 Tab 键行为一致);普通段落 → 左缩进 +720 twips。
 */
export function execIndent(): void {
  const view = getView();
  if (!view) {
    return;
  }
  if (isInList(view.state)) {
    apply(increaseListLevel);
  } else {
    apply(increaseIndent());
  }
}

/**
 * 减少缩进 / Decrease indent.
 * 列表内 → 升一级(一级时退出列表);普通段落 → 左缩进 -720 twips(最低 0)。
 */
export function execOutdent(): void {
  const view = getView();
  if (!view) {
    return;
  }
  if (isInList(view.state)) {
    apply(decreaseListLevel);
  } else {
    apply(decreaseIndent());
  }
}

// === 段落格式 (Phase 3) ===

/** 设置行距(倍数:1.0/1.15/1.5/2.0)/ Set line spacing (multiple) */
export function execSetLineSpacing(value: number): void {
  apply(setLineSpacing(value));
}

/** 设置段前/段后间距(twips,1pt = 20 twips)/ Set paragraph spacing before/after (twips) */
export function execSetParagraphSpacing(before: number, after: number): void {
  apply(setSpaceBefore(before));
  apply(setSpaceAfter(after));
}

/**
 * 设置缩进(twips)/ Set indentation (twips).
 * 仅传入的字段会被设置;未传入的字段保持不变。
 * - left: 左缩进 / left indent
 * - right: 右缩进 / right indent
 * - firstLine: 首行缩进(正数缩进)/ first-line indent (positive = indent)
 */
export function execSetIndentation(opts: {
  left?: number;
  right?: number;
  firstLine?: number;
}): void {
  if (opts.left !== undefined) {
    apply(setIndentLeft(opts.left));
  }
  if (opts.right !== undefined) {
    apply(setIndentRight(opts.right));
  }
  if (opts.firstLine !== undefined) {
    apply(setIndentFirstLine(opts.firstLine));
  }
}
