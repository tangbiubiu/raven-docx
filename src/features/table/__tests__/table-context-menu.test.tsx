// features/table/__tests__/TableContextMenu.test.tsx — TableContextMenu 测试
// 测试表格右键菜单的渲染和操作

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableContextMenu } from "../components/TableContextMenu";

// Mock useTableOperations hook
const mockOperations = {
  addRowAbove: vi.fn(),
  addRowBelow: vi.fn(),
  addColumnLeft: vi.fn(),
  addColumnRight: vi.fn(),
  deleteRow: vi.fn(),
  deleteColumn: vi.fn(),
  mergeCells: vi.fn(),
  splitCells: vi.fn(),
  deleteTable: vi.fn(),
  isInTableCell: vi.fn().mockReturnValue(true),
};

vi.mock("../hooks/useTableOperations", () => ({
  useTableOperations: () => mockOperations,
}));

describe("TableContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOperations.isInTableCell.mockReturnValue(true);
  });

  it("当光标在表格内时渲染菜单", () => {
    render(<TableContextMenu onClose={vi.fn()} />);
    expect(screen.getByTestId("table-context-menu")).toBeInTheDocument();
  });

  it("当光标不在表格内时不渲染", () => {
    mockOperations.isInTableCell.mockReturnValue(false);
    const { container } = render(<TableContextMenu onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("点击插入行上方调用 addRowAbove", () => {
    const onClose = vi.fn();
    render(<TableContextMenu onClose={onClose} />);

    fireEvent.click(screen.getByTestId("add-row-above-btn"));
    expect(mockOperations.addRowAbove).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("点击插入行下方调用 addRowBelow", () => {
    const onClose = vi.fn();
    render(<TableContextMenu onClose={onClose} />);

    fireEvent.click(screen.getByTestId("add-row-below-btn"));
    expect(mockOperations.addRowBelow).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("点击删除行调用 deleteRow", () => {
    const onClose = vi.fn();
    render(<TableContextMenu onClose={onClose} />);

    fireEvent.click(screen.getByTestId("delete-row-btn"));
    expect(mockOperations.deleteRow).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("点击合并单元格调用 mergeCells", () => {
    const onClose = vi.fn();
    render(<TableContextMenu onClose={onClose} />);

    fireEvent.click(screen.getByTestId("merge-cells-btn"));
    expect(mockOperations.mergeCells).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("点击删除表格调用 deleteTable", () => {
    const onClose = vi.fn();
    render(<TableContextMenu onClose={onClose} />);

    fireEvent.click(screen.getByTestId("delete-table-btn"));
    expect(mockOperations.deleteTable).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
