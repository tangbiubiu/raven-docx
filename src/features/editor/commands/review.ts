// editor/commands/review.ts — 审阅 (Phase 5):修订模式开关、接受/拒绝修订、定位修订。
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
import { apply, getView } from "./shared";

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
