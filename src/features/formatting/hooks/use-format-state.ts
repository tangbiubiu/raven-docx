// useFormatState — 格式状态 Hook (Format State Hook)
// 直接从 ProseMirror EditorView 读取当前选区的格式状态，
// 避免依赖 store 的 selectionFormat（有更新延迟）。
// Reference: .dev/plan/implementation-plan.md §Phase 2

import type { Mark } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { useDocumentStore } from "@/stores/useDocumentStore";

/**
 * 从 EditorView 读取当前选区的 mark 状态。
 * 返回一个函数 `isActive(markName)` 用于判断某个 mark 是否 active。
 */
export function useFormatState() {
  const editorBridge = useDocumentStore((s) => s.editorBridge);
  // 响应式选区格式值:订阅 selectionFormat 的对应字段,随选区变化重渲染。
  // Reactive selection format values: subscribe to selectionFormat fields.
  const fontFamily = useDocumentStore((s) => s.selectionFormat?.fontFamily);
  const fontSize = useDocumentStore((s) => s.selectionFormat?.fontSize);
  const textColor = useDocumentStore((s) => s.selectionFormat?.textColor);
  const highlight = useDocumentStore((s) => s.selectionFormat?.highlight);

  /** 获取 EditorView，不存在则返回 null */
  const getView = (): EditorView | null => {
    if (!editorBridge) {
      return null;
    }
    return editorBridge.getEditorView() as EditorView | null;
  };

  /**
   * 判断某个 mark 在当前选区是否 active。
   * 直接读取 ProseMirror 的 selection.$from.marks()，
   * 而非 store 的 selectionFormat（避免延迟）。
   */
  const isActive = (markName: string): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const { state } = view;
    const { from, to } = state.selection;

    // 空选区：检查光标位置的 stored marks 或光标前的 mark
    if (from === to) {
      const marks = state.storedMarks ?? state.selection.$from.marks();
      return marks.some((m: Mark) => m.type.name === markName);
    }

    // 有选区：检查选区内所有节点是否都有该 mark
    let hasMark = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (
        node.isText &&
        node.marks.some((m: Mark) => m.type.name === markName)
      ) {
        hasMark = true;
      }
    });
    return hasMark;
  };

  /**
   * 判断当前对齐方式是否 active。
   * 从选区所在 block 节点的 attrs 中读取。
   */
  const isAlignActive = (alignment: string): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const { state } = view;
    const { $from } = state.selection;
    const blockNode = $from.parent;
    if (!blockNode) {
      return false;
    }
    const nodeAlignment = (blockNode.attrs as Record<string, unknown>)
      ?.alignment;
    // 默认对齐为 left
    const effectiveAlignment = (nodeAlignment as string | undefined) ?? "left";
    return effectiveAlignment === alignment;
  };

  /**
   * 获取当前标题级别（1-6），undefined 表示正文。
   */
  const getHeadingLevel = (): number | undefined => {
    const view = getView();
    if (!view) {
      return;
    }

    const { state } = view;
    const { $from } = state.selection;
    const node = $from.parent;
    if (!node) {
      return;
    }

    if (node.type.name === "heading") {
      return (node.attrs as Record<string, unknown>)?.level as
        | number
        | undefined;
    }
    return;
  };

  /**
   * 判断当前是否在某种列表内。
   */
  const getListType = (): "ordered" | "unordered" | null => {
    const view = getView();
    if (!view) {
      return null;
    }

    const { state } = view;
    const { $from } = state.selection;

    // 向上遍历祖先节点，查找 list_item 的父节点
    const depth = $from.depth;
    if (typeof depth !== "number") {
      return null;
    }
    for (let d = depth; d > 0; d--) {
      const node = $from.node(d);
      if (!node) {
        continue;
      }
      if (node.type.name === "ordered_list") {
        return "ordered";
      }
      if (node.type.name === "bullet_list") {
        return "unordered";
      }
    }
    return null;
  };

  return {
    isActive,
    isAlignActive,
    getHeadingLevel,
    getListType,
    // 响应式选区格式值(从 selectionFormat 读取,随选区变化更新)
    // Reactive selection format values (from selectionFormat, update on selection change)
    fontFamily,
    fontSize,
    textColor,
    highlight,
  };
}
