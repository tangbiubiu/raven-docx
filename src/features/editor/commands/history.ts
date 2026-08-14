// editor/commands/history.ts — 撤销/重做:委托 prosemirror-history。

import { redo, undo } from "prosemirror-history";
import { apply, getView } from "./shared";

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
