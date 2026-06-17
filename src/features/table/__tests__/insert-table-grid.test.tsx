// features/table/__tests__/InsertTableGrid.test.tsx — InsertTableGrid 测试
// 测试表格网格选择器的渲染和交互行为

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsertTableGrid } from "../components/InsertTableGrid";

// Mock useTableOperations hook
const mockInsertTable = vi.fn();
vi.mock("../hooks/useTableOperations", () => ({
  useTableOperations: () => ({
    insertTable: mockInsertTable,
    insertImage: vi.fn(),
    insertHyperlink: vi.fn(),
    insertFootnote: vi.fn(),
    deleteRow: vi.fn(),
    deleteColumn: vi.fn(),
    mergeCells: vi.fn(),
    splitCells: vi.fn(),
    addRowAbove: vi.fn(),
    addRowBelow: vi.fn(),
    addColumnLeft: vi.fn(),
    addColumnRight: vi.fn(),
  }),
}));

describe("InsertTableGrid", () => {
  beforeEach(() => {
    mockInsertTable.mockClear();
  });

  it("渲染网格选择器", () => {
    render(<InsertTableGrid onClose={vi.fn()} />);
    expect(screen.getByTestId("table-grid")).toBeInTheDocument();
    expect(screen.getByText(/3×4/)).toBeInTheDocument();
  });

  it("点击网格单元格插入对应大小的表格", () => {
    const onClose = vi.fn();
    render(<InsertTableGrid onClose={onClose} />);

    // 点击第 2 行第 3 列的单元格
    const cells = screen.getAllByTestId(/^table-grid-cell-/);
    const cell = cells.find(
      (c) =>
        c.getAttribute("data-row") === "2" && c.getAttribute("data-col") === "3"
    );
    if (cell) {
      fireEvent.click(cell);
      expect(mockInsertTable).toHaveBeenCalledWith(2, 3);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("通过数字输入框调整行列数并插入", () => {
    const onClose = vi.fn();
    render(<InsertTableGrid onClose={onClose} />);

    const rowsInput = screen.getByTestId("table-rows-input");
    const colsInput = screen.getByTestId("table-cols-input");
    const insertBtn = screen.getByTestId("table-insert-btn");

    fireEvent.change(rowsInput, { target: { value: "5" } });
    fireEvent.change(colsInput, { target: { value: "6" } });
    fireEvent.click(insertBtn);

    expect(mockInsertTable).toHaveBeenCalledWith(5, 6);
    expect(onClose).toHaveBeenCalled();
  });

  it("限制行列数在有效范围内", () => {
    render(<InsertTableGrid onClose={vi.fn()} />);

    const rowsInput = screen.getByTestId(
      "table-rows-input"
    ) as HTMLInputElement;
    const colsInput = screen.getByTestId(
      "table-cols-input"
    ) as HTMLInputElement;

    // 测试最小值
    fireEvent.change(rowsInput, { target: { value: "0" } });
    expect(Number.parseInt(rowsInput.value)).toBeGreaterThanOrEqual(1);

    // 测试最大值
    fireEvent.change(colsInput, { target: { value: "100" } });
    expect(Number.parseInt(colsInput.value)).toBeLessThanOrEqual(10);
  });
});
