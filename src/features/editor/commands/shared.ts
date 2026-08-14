// editor/commands/shared.ts — 共享基础设施:EditorView 获取、命令派发、批量应用
// 纯函数层,零 React 依赖。Toolbar 和 MenuBar 共用。

import type { Command } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** 从 bridge 获取当前 EditorView,无 bridge 时返回 null */
export function getView(): EditorView | null {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return null;
  }
  return bridge.getEditorView() as EditorView | null;
}

export function dispatch(view: EditorView, cmd: Command): void {
  const { state, dispatch: viewDispatch } = view;
  cmd(state, viewDispatch);
}

export function apply(cmd: Command): void {
  const view = getView();
  if (view) {
    dispatch(view, cmd);
  }
}

/**
 * 批量应用命令(单事务,一次 undo)/ Apply commands in a single transaction.
 *
 * 在单个累积 transaction 上追加所有命令产生的 step,仅 dispatch 一次,
 * 避免一次格式刷应用产生 15+ 个 undo step。每个命令接收"前一命令应用后的 state"
 * 与一个把 innerTr.steps 追加到累积 tr 的 dispatch 回调。
 *
 * 注意:ProseMirror Transform 没有 append(innerTr) 方法,只能逐个 tr.step(step)。
 * innerTr 由当前 state 构建,其 steps 与累积 tr 的当前文档兼容。
 */
export function applyBatch(commands: Command[]): void {
  const view = getView();
  if (!view) {
    return;
  }
  let state = view.state;
  const tr = state.tr;
  for (const cmd of commands) {
    cmd(state, (innerTr) => {
      for (const step of innerTr.steps) {
        tr.step(step);
      }
      state = state.applyTransaction(innerTr).state;
    });
  }
  if (tr.steps.length > 0) {
    view.dispatch(tr);
  }
}
