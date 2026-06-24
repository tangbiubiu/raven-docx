// src/features/ribbon/components/__tests__/tabs/TableToolsTab.test.tsx — TableToolsTab 测试 / TableToolsTab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableToolsTab } from "../../tabs/TableToolsTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

const mockCmds = vi.hoisted(() => ({
  execMergeCells: vi.fn(),
  execSplitCell: vi.fn(),
  execSetCellFillColor: vi.fn(),
  execSetCellVerticalAlign: vi.fn(),
  execToggleHeaderRow: vi.fn(),
  execApplyTableStyle: vi.fn(),
  execSetCellBorder: vi.fn(),
  execSetRowHeight: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

const props = {
  onNew: vi.fn(),
  onOpen: vi.fn(),
  onSave: vi.fn(),
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onToggleOutline: vi.fn(),
  onToggleAgentSidebar: vi.fn(),
  onPageSetup: vi.fn(),
  onHeaderFooter: vi.fn(),
  onNewComment: vi.fn(),
  onInsertPageBreak: vi.fn(),
};

describe("TableToolsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染表格工具按钮组", () => {
    render(<TableToolsTab {...props} />);
    expect(screen.getByText("ribbon.group.tableStyle")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.borders")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.cellSize")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.alignment")).toBeInTheDocument();
  });

  it("点击合并单元格调用 execMergeCells", () => {
    render(<TableToolsTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-mergeCells"));
    expect(mockCmds.execMergeCells).toHaveBeenCalled();
  });

  it("点击拆分单元格调用 execSplitCell", () => {
    render(<TableToolsTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-splitCell"));
    expect(mockCmds.execSplitCell).toHaveBeenCalled();
  });

  it("点击表头切换调用 execToggleHeaderRow", () => {
    render(<TableToolsTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-toggleHeaderRow"));
    expect(mockCmds.execToggleHeaderRow).toHaveBeenCalled();
  });

  it("底纹颜色选择调用 execSetCellFillColor", () => {
    render(<TableToolsTab {...props} />);
    const input = screen.getByTestId("ribbon-cellFillColor");
    fireEvent.input(input, { target: { value: "#ff0000" } });
    fireEvent.change(input, { target: { value: "#ff0000" } });
    expect(mockCmds.execSetCellFillColor).toHaveBeenCalledWith("#ff0000");
  });

  it("垂直对齐下拉选择调用 execSetCellVerticalAlign", () => {
    render(<TableToolsTab {...props} />);
    const select = screen.getByTestId("ribbon-cellVAlign");
    fireEvent.change(select, { target: { value: "center" } });
    expect(mockCmds.execSetCellVerticalAlign).toHaveBeenCalledWith("center");
  });

  it("行高数值输入调用 execSetRowHeight", () => {
    render(<TableToolsTab {...props} />);
    const input = screen.getByTestId("ribbon-rowHeight");
    fireEvent.change(input, { target: { value: "400" } });
    expect(mockCmds.execSetRowHeight).toHaveBeenCalledWith(400);
  });
});
