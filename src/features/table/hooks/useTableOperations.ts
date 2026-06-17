// features/table/hooks/useTableOperations.ts — 表格操作 Hook (Table Operations Hook)
// 封装 prosemirror-tables 的所有表格操作命令
// Reference: .dev/plan/phase4-branch-plan.md §1.1

import {
  isInTable,
  addColumnAfter as pmAddColumnAfter,
  addColumnBefore as pmAddColumnBefore,
  addRowAfter as pmAddRowAfter,
  addRowBefore as pmAddRowBefore,
  deleteColumn as pmDeleteColumn,
  deleteRow as pmDeleteRow,
  deleteTable as pmDeleteTable,
  mergeCells as pmMergeCells,
  splitCell,
  tableNodes,
} from "prosemirror-tables";
import { useDocumentStore } from "@/stores/useDocumentStore";

/**
 * 表格操作 Hook。
 * 提供插入、删除、合并、拆分等表格操作的统一接口。
 */
export function useTableOperations() {
  const editorBridge = useDocumentStore((s) => s.editorBridge);

  /** 获取 ProseMirror EditorView */
  const getView = () => {
    if (!editorBridge) {
      return null;
    }
    return editorBridge.getEditorView();
  };

  /** 检查光标是否在表格内 */
  const isInTableCell = (): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }
    const { state } = view;
    return isInTable(state);
  };

  /**
   * 插入表格。
   * @param rows - 行数
   * @param cols - 列数
   */
  const insertTable = (rows: number, cols: number): void => {
    const view = getView();
    if (!view) {
      return;
    }

    const { state, dispatch } = view;
    const { from } = state.selection;

    // 使用 prosemirror-tables 的 tableNodes 创建表格结构
    const nodes = tableNodes(state.schema);

    // 创建表头行
    const headerCells = [];
    for (let i = 0; i < cols; i++) {
      headerCells.push(
        nodes.table_header.createAndFill() ||
          state.schema.nodes.table_header.create()
      );
    }
    const headerRow = nodes.table_row.create(null, headerCells);

    // 创建数据行
    const dataRows: ReturnType<typeof nodes.table_row.create>[] = [];
    for (let i = 1; i < rows; i++) {
      const cells: ReturnType<typeof nodes.table_cell.create>[] = [];
      for (let j = 0; j < cols; j++) {
        cells.push(
          nodes.table_cell.createAndFill() ||
            state.schema.nodes.table_cell.create()
        );
      }
      dataRows.push(nodes.table_row.create(null, cells));
    }

    // 创建完整表格
    const table = nodes.table.create(null, [headerRow, ...dataRows]);

    // 插入表格
    const tr = state.tr.insert(from, table);
    dispatch(tr);
  };

  /** 插入图片（占位实现，等待 Agent API） */
  const insertImage = (path: string): void => {
    const view = getView();
    if (!view) {
      return;
    }
    view.dispatch(view.state.tr.insertText(`![图片](${path})`));
  };

  /** 插入超链接 */
  const insertHyperlink = (url: string, text: string): void => {
    const view = getView();
    if (!view) {
      return;
    }
    const { state, dispatch } = view;
    const { from } = state.selection;
    const linkMark = state.schema.marks.link;

    if (linkMark) {
      const displayText = text || url;
      const tr = state.tr
        .insertText(displayText, from)
        .addMark(
          from,
          from + displayText.length,
          linkMark.create({ href: url })
        );
      dispatch(tr);
    } else {
      // Fallback: markdown-style link
      view.dispatch(state.tr.insertText(`[${text}](${url})`));
    }
  };

  /** 插入脚注（占位实现） */
  const insertFootnote = (): void => {
    const view = getView();
    if (!view) {
      return;
    }
    view.dispatch(view.state.tr.insertText("[脚注]"));
  };

  /** 在上方插入行 */
  const addRowAbove = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmAddRowBefore(view.state, view.dispatch);
  };

  /** 在下方插入行 */
  const addRowBelow = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmAddRowAfter(view.state, view.dispatch);
  };

  /** 在左侧插入列 */
  const addColumnLeft = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmAddColumnBefore(view.state, view.dispatch);
  };

  /** 在右侧插入列 */
  const addColumnRight = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmAddColumnAfter(view.state, view.dispatch);
  };

  /** 删除当前行 */
  const deleteRow = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmDeleteRow(view.state, view.dispatch);
  };

  /** 删除当前列 */
  const deleteColumn = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmDeleteColumn(view.state, view.dispatch);
  };

  /** 合并选中的单元格 */
  const mergeCells = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmMergeCells(view.state, view.dispatch);
  };

  /** 拆分合并的单元格 */
  const splitCells = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    splitCell(view.state, view.dispatch);
  };

  /** 删除整个表格 */
  const deleteTable = (): void => {
    const view = getView();
    if (!(view && isInTableCell())) {
      return;
    }
    pmDeleteTable(view.state, view.dispatch);
  };

  return {
    insertTable,
    insertImage,
    insertHyperlink,
    insertFootnote,
    addRowAbove,
    addRowBelow,
    addColumnLeft,
    addColumnRight,
    deleteRow,
    deleteColumn,
    mergeCells,
    splitCells,
    deleteTable,
    isInTableCell,
  };
}
