// editor/commands.ts — Shared ProseMirror commands (共享 PM 命令)
// 纯函数层，零 React 依赖。Toolbar 和 MenuBar 共用。
// Reference: .dev/plan/implementation-plan.md §Phase 2

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

/** 插入表格（占位实现，Phase 4 完整化） */
export function execInsertTable(_rows = 3, _cols = 3): void {
  const view = getView();
  if (!view) {
    return;
  }
  view.dispatch(
    view.state.tr.insertText(`\n[表格 ${_rows}×${_cols} — 即将实现]\n`)
  );
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
    const { open } = await import("@tauri-apps/plugin-dialog");
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
