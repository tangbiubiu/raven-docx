// editor/commands.ts — Shared ProseMirror commands (共享 PM 命令)
// 纯函数层，零 React 依赖。Toolbar 和 MenuBar 共用。
// Reference: .dev/plan/implementation-plan.md §Phase 2

import {
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
  if (nodeName === "paragraph") {
    setBlockType(node)(view.state, view.dispatch);
  } else {
    setBlockType(node, attrs ?? null)(view.state, view.dispatch);
  }
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
