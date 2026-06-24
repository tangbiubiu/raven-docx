// editor/commands.ts — Shared ProseMirror commands (共享 PM 命令)
// 纯函数层，零 React 依赖。Toolbar 和 MenuBar 共用。
// Reference: .dev/plan/implementation-plan.md §Phase 2

import {
  insertTable,
  setFontFamily,
  setFontSize,
  setHighlight,
  setTextColor,
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
