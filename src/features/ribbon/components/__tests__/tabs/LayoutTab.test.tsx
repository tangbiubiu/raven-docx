// src/features/ribbon/components/__tests__/tabs/LayoutTab.test.tsx — LayoutTab 测试 / LayoutTab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LayoutTab } from "../../tabs/LayoutTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

const mockCmds = vi.hoisted(() => ({
  execIndent: vi.fn(),
  execOutdent: vi.fn(),
  execSetLineSpacing: vi.fn(),
  execSetParagraphSpacing: vi.fn(),
  execSetIndentation: vi.fn(),
  execSetWatermark: vi.fn(),
  execGetWatermark: vi.fn(() => null),
  execSetColumns: vi.fn(),
  execInsertSectionBreak: vi.fn(),
  execRemoveSectionBreak: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

vi.mock("../../WatermarkDialog", () => ({
  WatermarkDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="watermark-dialog-mock">
      <button onClick={onClose} type="button">
        close
      </button>
    </div>
  ),
}));

// Mock Dialog 组件避免 jsdom 中 Radix Portal 兼容性问题(variable-form.test 同款)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="columns-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

// Radix Select 在 jsdom 下打开下拉需要 PointerEvent;mock 为原生 <select>,
// SelectTrigger 仅渲染 trigger 文本,onValueChange 通过 change 事件触发。
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="select-root"
      onChange={(e) => onValueChange?.(e.target.value)}
      value={value ?? ""}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

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

describe("LayoutTab", () => {
  beforeEach(() => vi.clearAllMocks());

  /** 从 wrapper testid 定位内部 <select>(mock 渲染原生 select)/ locate select */
  function getSelect(testId: string): HTMLSelectElement {
    const el = screen.getByTestId(testId).querySelector("select");
    if (!el) {
      throw new Error(`select not found in ${testId}`);
    }
    return el;
  }

  it("渲染页面设置/页眉页脚/缩进组", () => {
    render(<LayoutTab {...props} />);
    expect(screen.getByText("ribbon.group.pageSetup")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.headerFooter")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.indent")).toBeInTheDocument();
  });

  it("渲染段落格式组(行距/段落间距/缩进值)", () => {
    render(<LayoutTab {...props} />);
    expect(screen.getByText("ribbon.group.lineSpacing")).toBeInTheDocument();
    expect(
      screen.getByText("ribbon.group.paragraphSpacing")
    ).toBeInTheDocument();
  });

  it("行距下拉包含 1.0/1.15/1.5/2.0 选项", () => {
    render(<LayoutTab {...props} />);
    const lineSpacing = screen.getByTestId("ribbon-lineSpacing");
    const vals = Array.from(lineSpacing.querySelectorAll("option")).map((o) =>
      o.getAttribute("value")
    );
    expect(vals).toEqual(["1.0", "1.15", "1.5", "2.0"]);
  });

  it("选择行距 1.5 调用 execSetLineSpacing(1.5)", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-lineSpacing"), {
      target: { value: "1.5" },
    });
    expect(mockCmds.execSetLineSpacing).toHaveBeenCalledWith(1.5);
  });

  it("选择行距 2.0 调用 execSetLineSpacing(2.0)", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-lineSpacing"), {
      target: { value: "2.0" },
    });
    expect(mockCmds.execSetLineSpacing).toHaveBeenCalledWith(2.0);
  });

  it("段前下拉包含 0/6/12/18/24 pt 选项", () => {
    render(<LayoutTab {...props} />);
    const before = screen.getByTestId("ribbon-spaceBefore");
    const vals = Array.from(before.querySelectorAll("option")).map((o) =>
      o.getAttribute("value")
    );
    expect(vals).toEqual(["0", "6", "12", "18", "24"]);
  });

  it("选择段前 12 pt 调用 execSetParagraphSpacing", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-spaceBefore"), {
      target: { value: "12" },
    });
    expect(mockCmds.execSetParagraphSpacing).toHaveBeenCalled();
    const args = mockCmds.execSetParagraphSpacing.mock.calls[0];
    // 段前 12pt → twips;段后维持当前(测试 mock 中默认 0)
    expect(args?.[0]).toBe(240); // 12pt × 20 twips/pt
  });

  it("选择段后 6 pt 调用 execSetParagraphSpacing", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-spaceAfter"), {
      target: { value: "6" },
    });
    expect(mockCmds.execSetParagraphSpacing).toHaveBeenCalled();
    const args = mockCmds.execSetParagraphSpacing.mock.calls[0];
    expect(args?.[1]).toBe(120); // 6pt × 20 twips/pt
  });

  it("左缩进下拉选择调用 execSetIndentation({ left })", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-indentLeft"), {
      target: { value: "567" },
    });
    expect(mockCmds.execSetIndentation).toHaveBeenCalledWith({
      left: 567,
    });
  });

  it("右缩进下拉选择调用 execSetIndentation({ right })", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-indentRight"), {
      target: { value: "567" },
    });
    expect(mockCmds.execSetIndentation).toHaveBeenCalledWith({
      right: 567,
    });
  });

  it("首行缩进下拉包含 0/2/4 字符选项", () => {
    render(<LayoutTab {...props} />);
    const firstLine = screen.getByTestId("ribbon-firstLineIndent");
    const vals = Array.from(firstLine.querySelectorAll("option")).map((o) =>
      o.getAttribute("value")
    );
    expect(vals).toEqual(["0", "2", "4"]);
  });

  it("选择首行缩进 2 字符调用 execSetIndentation({ firstLine })", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-firstLineIndent"), {
      target: { value: "2" },
    });
    expect(mockCmds.execSetIndentation).toHaveBeenCalledWith({
      firstLine: expect.any(Number),
    });
  });

  it("点击页面设置触发 onPageSetup", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-pageSetup"));
    expect(props.onPageSetup).toHaveBeenCalled();
  });

  it("点击页眉页脚触发 onHeaderFooter", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-headerFooter"));
    expect(props.onHeaderFooter).toHaveBeenCalled();
  });

  it("渲染水印组", () => {
    render(<LayoutTab {...props} />);
    expect(screen.getByText("ribbon.group.watermark")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-watermark")).toBeInTheDocument();
  });

  it("点击水印按钮弹出水印对话框", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-watermark"));
    expect(screen.getByTestId("watermark-dialog-mock")).toBeInTheDocument();
  });

  it("点击增加缩进调用 execIndent", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-indent"));
    expect(mockCmds.execIndent).toHaveBeenCalled();
  });

  it("渲染分栏组(1/2/3 栏/更多分栏/分节符)", () => {
    render(<LayoutTab {...props} />);
    expect(screen.getByText("ribbon.group.columns")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-columns-1")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-columns-2")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-columns-3")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-columns-more")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-sectionBreak")).toBeInTheDocument();
  });

  it("点击 2 栏调用 execSetColumns({ columnCount: 2 })", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-columns-2"));
    expect(mockCmds.execSetColumns).toHaveBeenCalledWith({ columnCount: 2 });
  });

  it("点击 3 栏调用 execSetColumns({ columnCount: 3 })", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-columns-3"));
    expect(mockCmds.execSetColumns).toHaveBeenCalledWith({ columnCount: 3 });
  });

  it("分节符选择连续调用 execInsertSectionBreak('continuous')", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-sectionBreak"), {
      target: { value: "continuous" },
    });
    expect(mockCmds.execInsertSectionBreak).toHaveBeenCalledWith("continuous");
  });

  it("分节符选择奇数页调用 execInsertSectionBreak('oddPage')", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-sectionBreak"), {
      target: { value: "oddPage" },
    });
    expect(mockCmds.execInsertSectionBreak).toHaveBeenCalledWith("oddPage");
  });

  it("分节符选择删除调用 execRemoveSectionBreak", () => {
    render(<LayoutTab {...props} />);
    fireEvent.change(getSelect("ribbon-sectionBreak"), {
      target: { value: "remove" },
    });
    expect(mockCmds.execRemoveSectionBreak).toHaveBeenCalledOnce();
  });

  it("点击更多分栏 → 对话框应用调用 execSetColumns", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-columns-more"));
    expect(screen.getByTestId("columns-dialog")).toBeInTheDocument();
    // 默认:2 栏 / 等宽 / 0.75cm / 无分隔线
    fireEvent.click(screen.getByText("columns.apply"));
    expect(mockCmds.execSetColumns).toHaveBeenCalledWith({
      columnCount: 2,
      columnSpace: 425,
      equalWidth: true,
      separator: false,
    });
  });
});
