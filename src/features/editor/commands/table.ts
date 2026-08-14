// editor/commands/table.ts — 表格 (Phase 4):插入、单元格合并/拆分、边框/底纹、
// 表格样式、垂直对齐、表头行、行高、表格属性。

import {
  applyTableStyle,
  insertTable,
  mergeCells,
  setCellBorder,
  setCellFillColor,
  setCellVerticalAlign,
  setRowHeight,
  setTableProperties,
  splitCell,
  toggleHeaderRow,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import { apply } from "./shared";

/** 插入表格(rows × cols,默认 3×3)/ Insert table */
export function execInsertTable(rows = 3, cols = 3): void {
  apply(insertTable(rows, cols));
}

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
