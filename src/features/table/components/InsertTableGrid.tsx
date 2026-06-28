// features/table/components/InsertTableGrid.tsx — 表格网格选择器 (Table Grid Selector)
// 通过网格选择行列数插入表格
// Reference: .dev/proto/workspace.html §table-modal

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useTableOperations } from "../hooks/useTableOperations";

const GRID_COLS = 8;
const GRID_ROWS = 10;
const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 4;
const MIN_ROWS = 1;
const MAX_ROWS = 20;
const MIN_COLS = 1;
const MAX_COLS = 10;

type InsertTableGridProps = {
  onClose: () => void;
};

/**
 * 表格网格选择器组件。
 * 用户通过悬停网格选择行列数，或输入精确数值。
 */
export function InsertTableGrid({ onClose }: InsertTableGridProps) {
  const { t } = useT();
  const { insertTable } = useTableOperations();

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [hoverRow, setHoverRow] = useState(DEFAULT_ROWS);
  const [hoverCol, setHoverCol] = useState(DEFAULT_COLS);

  /** 处理网格单元格悬停 */
  const handleCellHover = (row: number, col: number) => {
    setHoverRow(row);
    setHoverCol(col);
  };

  /** 处理网格单元格点击 */
  const handleCellClick = (row: number, col: number) => {
    insertTable(row, col);
    onClose();
  };

  /** 处理数字输入 */
  const handleRowsChange = (value: string) => {
    const num = Number.parseInt(value, 10);
    if (!Number.isNaN(num)) {
      const clamped = Math.max(MIN_ROWS, Math.min(MAX_ROWS, num));
      setRows(clamped);
      setHoverRow(clamped);
    }
  };

  const handleColsChange = (value: string) => {
    const num = Number.parseInt(value, 10);
    if (!Number.isNaN(num)) {
      const clamped = Math.max(MIN_COLS, Math.min(MAX_COLS, num));
      setCols(clamped);
      setHoverCol(clamped);
    }
  };

  /** 确认插入 */
  const handleInsert = () => {
    insertTable(rows, cols);
    onClose();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* 尺寸标签 */}
      <p className="text-muted-foreground text-xs">
        {t("table.insert.grid", { rows: hoverRow, cols: hoverCol })}
      </p>

      {/* 网格选择器 */}
      <div
        className="grid gap-1"
        data-testid="table-grid"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1.5rem)` }}
      >
        {Array.from({ length: GRID_ROWS }, (_, rowIdx) =>
          Array.from({ length: GRID_COLS }, (_col, colIdx) => {
            const row = rowIdx + 1;
            const col = colIdx + 1;
            const isHighlighted = row <= hoverRow && col <= hoverCol;

            return (
              <button
                className={`h-6 w-6 rounded border ${
                  isHighlighted
                    ? "border-primary bg-primary/20"
                    : "border-muted bg-muted/50"
                } transition-colors hover:border-primary hover:bg-primary/20`}
                data-col={col}
                data-row={row}
                data-testid={`table-grid-cell-${row}-${col}`}
                key={`${row}-${col}`}
                onClick={() => handleCellClick(row, col)}
                onMouseEnter={() => handleCellHover(row, col)}
                type="button"
              />
            );
          })
        )}
      </div>

      {/* 数字输入框 */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="table-rows">
            {t("table.rows") || "行数"}
          </label>
          <Input
            className="w-16"
            data-testid="table-rows-input"
            id="table-rows"
            max={MAX_ROWS}
            min={MIN_ROWS}
            onChange={(e) => handleRowsChange(e.target.value)}
            type="number"
            value={rows}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="table-cols">
            {t("table.cols") || "列数"}
          </label>
          <Input
            className="w-16"
            data-testid="table-cols-input"
            id="table-cols"
            max={MAX_COLS}
            min={MIN_COLS}
            onChange={(e) => handleColsChange(e.target.value)}
            type="number"
            value={cols}
          />
        </div>
      </div>

      {/* 插入按钮 */}
      <Button
        className="w-full"
        data-testid="table-insert-btn"
        onClick={handleInsert}
      >
        {t("table.insert")}
      </Button>
    </div>
  );
}
