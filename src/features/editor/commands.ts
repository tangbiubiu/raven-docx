// editor/commands.ts — Shared ProseMirror commands (共享 PM 命令)
// 纯函数层，零 React 依赖。Toolbar 和 MenuBar 共用。
// Reference: .dev/plan/implementation-plan.md §Phase 2

import {
  alignCenter,
  alignJustify,
  alignLeft,
  alignRight,
  applyTableStyle,
  insertTable,
  mergeCells,
  setCellBorder,
  setCellFillColor,
  setCellVerticalAlign,
  setFontFamily,
  setFontSize,
  setHighlight,
  setImageWrapType,
  setRowHeight,
  setTableProperties,
  setTextColor,
  splitCell,
  toggleHeaderRow,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import { open } from "@tauri-apps/plugin-dialog";
import { lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { liftListItem, sinkListItem } from "prosemirror-schema-list";
import type { Command } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Alignment } from "@/features/formatting/constants";
import { useDocumentStore } from "@/stores/useDocumentStore";

// === 内部获取 EditorView ===

function getView(): EditorView | null {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return null;
  }
  return bridge.getEditorView() as EditorView | null;
}

function dispatch(view: EditorView, cmd: Command): void {
  const { state, dispatch: viewDispatch } = view;
  cmd(state, viewDispatch);
}

function apply(cmd: Command): void {
  const view = getView();
  if (view) {
    dispatch(view, cmd);
  }
}

// === Mark 操作 ===

/** 切换文本标记（bold/italic/underline/strike/superscript/subscript 等） */
export function execToggleMark(markName: string): void {
  const view = getView();
  if (!view) {
    return;
  }
  const mark = view.state.schema.marks[markName];
  if (!mark) {
    return;
  }
  toggleMark(mark)(view.state, view.dispatch);
}

// === 字体/字号/颜色/高亮(基于 docx-editor-core PM 命令)===

/** 设置字体族(ascii + hAnsi 同步设置)/ Set font family */
export function execSetFontFamily(fontName: string): void {
  apply(setFontFamily(fontName));
}

/**
 * 设置 CJK 字体族(三字段同设)/ Set CJK font family (co-set ascii+hAnsi+eastAsia).
 *
 * 自定义 ProseMirror 命令:库的 setFontFamily 只设 ascii+hAnsi。
 * 布局层 vt() 和 toDOM 都只读 ascii||hAnsi,仅设 eastAsia 无法渲染。
 * 故 CJK 字体名同时写入 ascii+hAnsi+eastAsia 三字段,确保:
 * - 渲染层(读 ascii)能拿到 CJK 字体名 → @font-face local() 别名命中系统字体
 * - OOXML 序列化时 eastAsia 字段正确(跨平台 Word 兼容)
 * 用 nodesBetween 逐节点读取现有 fontFamily mark attrs,合并三字段后
 * 对每个文本段单独 addMark(addMark 替换整个 mark 而非合并 attrs,故须逐节点处理)。
 *
 * 光标(空选区)用 storedMarks 设定,后续输入继承该 mark。
 */
export function execSetFontFamilyEastAsia(fontName: string): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { state, dispatch: viewDispatch } = view;
  const { from, to, empty } = state.selection;
  const markType = state.schema.marks.fontFamily;
  if (!markType) {
    return;
  }

  if (empty) {
    // 光标处:合并进 storedMarks(保留现有 fontFamily 的 ascii/hAnsi 等)
    const existing = state.storedMarks?.find((m) => m.type === markType);
    const mergedAttrs = {
      ...(existing?.attrs ?? {}),
      ascii: fontName,
      hAnsi: fontName,
      eastAsia: fontName,
    };
    const mark = markType.create(mergedAttrs);
    const nextStored = [
      ...(state.storedMarks?.filter((m) => m.type !== markType) ?? []),
      mark,
    ];
    viewDispatch(state.tr.setStoredMarks(nextStored));
    return;
  }

  // 选区:先移除旧 fontFamily mark,再逐节点读取旧 attrs 合并 eastAsia 重新 addMark
  let tr = state.tr.removeMark(from, to, markType);

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) {
      return;
    }
    // 读取该文本节点在 removeMark 之前的 fontFamily mark attrs
    const oldMark = node.marks.find((m) => m.type === markType);
    const mergedAttrs = {
      ...(oldMark?.attrs ?? {}),
      ascii: fontName,
      hAnsi: fontName,
      eastAsia: fontName,
    };
    const mergedMark = markType.create(mergedAttrs);
    // pos 是节点起始位置,nodeSize 为文本长度
    const nodeFrom = Math.max(pos, from);
    const nodeTo = Math.min(pos + node.nodeSize, to);
    if (nodeFrom < nodeTo) {
      tr = tr.addMark(nodeFrom, nodeTo, mergedMark);
    }
  });

  viewDispatch(tr);
}

/** 设置字号(half-points,OOXML w:sz 刻度,24 = 12pt)/ Set font size */
export function execSetFontSize(sizeHalfPt: number): void {
  apply(setFontSize(sizeHalfPt));
}

/** 设置文字颜色(rgb 不带 # 前缀,自动剥离)/ Set text color */
export function execSetTextColor(rgb: string): void {
  const normalized = rgb.replace("#", "");
  apply(setTextColor({ rgb: normalized }));
}

/** 设置文本高亮(颜色名,如 'yellow')/ Set text highlight */
export function execSetHighlight(color: string): void {
  apply(setHighlight(color));
}

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

// === 列表 ===

/** 包装为列表（ordered_list / bullet_list） */
export function execWrapIn(nodeName: string): void {
  const view = getView();
  if (!view) {
    return;
  }
  const node = view.state.schema.nodes[nodeName];
  if (!node) {
    return;
  }
  wrapIn(node)(view.state, view.dispatch);
}

/** 取消列表/缩进 */
export function execLift(): void {
  apply(lift);
}

// === 撤销/重做 ===

/** 执行撤销 */
export function execUndo(): void {
  apply(undo);
}

/** 执行重做 */
export function execRedo(): void {
  apply(redo);
}

/** 检查是否可以撤销 */
export function canUndo(): boolean {
  const view = getView();
  if (!view) {
    return false;
  }
  return undo(view.state);
}

/** 检查是否可以重做 */
export function canRedo(): boolean {
  const view = getView();
  if (!view) {
    return false;
  }
  return redo(view.state);
}

// === 缩进 ===

/** 增加缩进（列表项下沉） */
export function execIndent(): void {
  const view = getView();
  if (!view) {
    return;
  }
  const listItemNode = view.state.schema.nodes.list_item;
  if (listItemNode) {
    sinkListItem(listItemNode)(view.state, view.dispatch);
  }
}

/** 减少缩进（列表项上浮） */
export function execOutdent(): void {
  const view = getView();
  if (!view) {
    return;
  }
  const listItemNode = view.state.schema.nodes.list_item;
  if (listItemNode) {
    liftListItem(listItemNode)(view.state, view.dispatch);
  }
}

// === 插入 ===

/** 插入表格(rows × cols,默认 3×3)/ Insert table */
export function execInsertTable(rows = 3, cols = 3): void {
  apply(insertTable(rows, cols));
}

/** 插入链接 */
export function execInsertLink(url = ""): void {
  const view = getView();
  if (!view) {
    return;
  }
  const href = url || "https://";
  const { from } = view.state.selection;
  const linkMark = view.state.schema.marks.link;
  if (linkMark) {
    const tr = view.state.tr
      .insertText(href, from)
      .addMark(from, from + href.length, linkMark.create({ href }));
    view.dispatch(tr);
  } else {
    view.dispatch(view.state.tr.insertText(`[链接](${href})`));
  }
}

/** 插入图片（触发文件选择器） */
export async function execInsertImage(): Promise<void> {
  const view = getView();
  if (!view) {
    return;
  }

  try {
    // Tauri plugin: only available in desktop runtime, not in web/test env
    const selected = await open({
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
        },
      ],
      multiple: false,
    });
    if (!selected || typeof selected !== "string") {
      return;
    }
    view.dispatch(view.state.tr.insertText(`![图片](${selected})`));
  } catch {
    view.dispatch(view.state.tr.insertText("[插入图片]"));
  }
}

// === Paragraph formatting (Phase 3) / 段落格式 ===
// 注意:不修改上方现有 import 语句;此处为 Phase 3 新增命令单独导入。
// Note: existing imports above are untouched; Phase 3 commands imported here.
import {
  setIndentFirstLine,
  setIndentLeft,
  setIndentRight,
  setLineSpacing,
  setSpaceAfter,
  setSpaceBefore,
} from "@eigenpal/docx-editor-core/prosemirror/commands";

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

// === Table commands (Phase 4) / 表格命令 ===

/** 合并选中的单元格 / Merge selected cells */
export function execMergeCells(): void {
  apply(mergeCells);
}

/** 拆分当前单元格 / Split the current cell */
export function execSplitCell(): void {
  apply(splitCell);
}

/** 设置单元格边框 / Set cell border on a side */
export function execSetCellBorder(
  side: "top" | "bottom" | "left" | "right" | "all",
  spec: {
    style: string;
    size?: number;
    color?: { rgb: string };
  } | null,
  clearOthers?: boolean
): void {
  apply(setCellBorder(side, spec, clearOthers));
}

/** 设置单元格底纹颜色(rgb 带 # 前缀,自动剥离;传 null 清除)/ Set cell fill color */
export function execSetCellFillColor(color: string | null): void {
  apply(setCellFillColor(color));
}

/** 应用表格样式 / Apply a named table style */
export function execApplyTableStyle(styleData: {
  styleId: string;
  tableBorders?: Record<string, unknown>;
  conditionals?: Record<string, unknown>;
  look?: Record<string, boolean>;
}): void {
  apply(applyTableStyle(styleData));
}

/** 设置单元格垂直对齐 / Set cell vertical alignment */
export function execSetCellVerticalAlign(
  align: "top" | "center" | "bottom"
): void {
  apply(setCellVerticalAlign(align));
}

/** 切换表头行 / Toggle the header row */
export function execToggleHeaderRow(): void {
  apply(toggleHeaderRow());
}

/** 设置行高(twips,1/20 pt)/ Set row height */
export function execSetRowHeight(
  height: number | null,
  rule?: "auto" | "atLeast" | "exact"
): void {
  apply(setRowHeight(height, rule));
}

/** 设置表格属性(宽度/对齐)/ Set table properties */
export function execSetTableProperties(props: {
  width?: number | null;
  widthType?: string | null;
  justification?: "left" | "center" | "right" | null;
}): void {
  apply(setTableProperties(props));
}

// === Image commands (Phase 4) / 图片命令 ===

/** OOXML 环绕类型(含方向便利值)/ Image wrap target */
export type ImageWrapTarget =
  | "inline"
  | "square"
  | "tight"
  | "through"
  | "topAndBottom"
  | "behind"
  | "inFront"
  | "squareLeft"
  | "squareRight";

/** 设置图片环绕类型 / Set image wrap type for the image at the current selection */
export function execSetImageWrapType(target: ImageWrapTarget): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { $from } = view.state.selection;
  // 向上遍历祖先节点,找到 image 节点的文档位置
  let pos: number | null = null;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node && node.type.name === "image") {
      pos = $from.before(d);
      break;
    }
  }
  if (pos === null) {
    return;
  }
  apply(setImageWrapType(pos, target));
}

// === Review & Print (Phase 5) / 审阅与打印 ===
// 修订模式(suggestion mode)开关、接受/拒绝修订、定位修订。
// 库以 suggestion-mode 插件实现 track-changes:开启后输入标记为 insertion、
// 删除标记为 deletion。这里封装为 exec* 纯函数,供 ReviewTab 调用。

import {
  acceptAllChanges,
  acceptChange,
  findNextChange,
  findPreviousChange,
  rejectAllChanges,
  rejectChange,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import {
  isSuggestionModeActive,
  toggleSuggestionMode,
} from "@eigenpal/docx-editor-core/prosemirror/plugins";
import { TextSelection } from "prosemirror-state";

/**
 * 切换修订模式(track changes)开关 / Toggle track-changes (suggestion) mode.
 * 开启后所有编辑被标记为 insertion/deletion 修订。
 */
export function execToggleTrackChanges(): void {
  const view = getView();
  if (!view) {
    return;
  }
  toggleSuggestionMode(view.state, view.dispatch);
}

/**
 * 查询修订模式是否开启 / Whether track-changes mode is active.
 * 供 ReviewTab 按钮反映 active 态。
 */
export function isTrackChangesActive(): boolean {
  const view = getView();
  if (!view) {
    return false;
  }
  return isSuggestionModeActive(view.state);
}

/**
 * 接受当前选区内的修订 / Accept tracked change in current selection.
 * 无选区(光标 collapsed)时作用于光标处的单处修订。
 */
export function execAcceptChange(): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { from, to } = view.state.selection;
  apply(acceptChange(from, to));
}

/**
 * 拒绝当前选区内的修订 / Reject tracked change in current selection.
 */
export function execRejectChange(): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { from, to } = view.state.selection;
  apply(rejectChange(from, to));
}

/**
 * 接受文档中全部修订 / Accept every tracked change in the document.
 */
export function execAcceptAllChanges(): void {
  apply(acceptAllChanges());
}

/**
 * 拒绝文档中全部修订 / Reject all tracked changes in the document.
 */
export function execRejectAllChanges(): void {
  apply(rejectAllChanges());
}

/**
 * 定位到下一处修订并选中、滚动可视 / Find next tracked change, select & scroll into view.
 * 从当前选区 head 向后查找;未找到则不操作。
 */
export function execFindNextChange(): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { head } = view.state.selection;
  const range = findNextChange(view.state, head);
  if (!range) {
    return;
  }
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, range.from, range.to)
  );
  view.dispatch(tr.scrollIntoView());
}

/**
 * 定位到上一处修订并选中、滚动可视 / Find previous tracked change, select & scroll into view.
 * 从当前选区 from 向前查找;未找到则不操作。
 */
export function execFindPreviousChange(): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { from } = view.state.selection;
  const range = findPreviousChange(view.state, from);
  if (!range) {
    return;
  }
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, range.from, range.to)
  );
  view.dispatch(tr.scrollIntoView());
}
