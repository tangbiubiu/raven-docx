// src/features/ribbon/components/__tests__/tabs/ReviewTab.test.tsx — 审阅标签页测试 / Review tab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewTab } from "../../tabs/ReviewTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// 修订命令 mock / track-changes commands mock
const mockCmds = vi.hoisted(() => ({
  execToggleTrackChanges: vi.fn(),
  isTrackChangesActive: vi.fn().mockReturnValue(false),
  execAcceptChange: vi.fn(),
  execRejectChange: vi.fn(),
  execFindNextChange: vi.fn(),
  execFindPreviousChange: vi.fn(),
  execAcceptAllChanges: vi.fn(),
  execRejectAllChanges: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn((selector) => {
    const state = { charCount: 42, selectionInfo: null };
    return typeof selector === "function" ? selector(state) : state;
  }),
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

describe("ReviewTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染批注组和校对组", () => {
    render(<ReviewTab {...props} />);
    expect(screen.getByText("ribbon.group.comments")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.proofing")).toBeInTheDocument();
  });

  it("点击新建批注触发 onNewComment", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-newComment"));
    expect(props.onNewComment).toHaveBeenCalled();
  });

  it("点击字数统计弹出对话框", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-wordCount"));
    expect(screen.getByText("ribbon.charCount.title")).toBeInTheDocument();
  });

  // === 5.1 修订模式 toggle / Track-changes toggle ===
  it("渲染修订模式组", () => {
    render(<ReviewTab {...props} />);
    expect(screen.getByText("ribbon.group.tracking")).toBeInTheDocument();
  });

  it("渲染修订模式按钮,初始未激活", () => {
    mockCmds.isTrackChangesActive.mockReturnValue(false);
    render(<ReviewTab {...props} />);
    const btn = screen.getByTestId("ribbon-trackChanges");
    expect(btn).toHaveAttribute("data-pressed", "false");
  });

  it("修订模式激活时按钮 data-pressed 为 true", () => {
    mockCmds.isTrackChangesActive.mockReturnValue(true);
    render(<ReviewTab {...props} />);
    const btn = screen.getByTestId("ribbon-trackChanges");
    expect(btn).toHaveAttribute("data-pressed", "true");
  });

  it("点击修订模式按钮调用 execToggleTrackChanges", () => {
    mockCmds.isTrackChangesActive.mockReturnValue(false);
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-trackChanges"));
    expect(mockCmds.execToggleTrackChanges).toHaveBeenCalledOnce();
  });

  // === 5.2 接受/拒绝/导航 / Accept/Reject/Navigate ===
  it("渲染更改组", () => {
    render(<ReviewTab {...props} />);
    expect(screen.getByText("ribbon.group.changes")).toBeInTheDocument();
  });

  it("点击接受修订调用 execAcceptChange", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-acceptChange"));
    expect(mockCmds.execAcceptChange).toHaveBeenCalledOnce();
  });

  it("点击拒绝修订调用 execRejectChange", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-rejectChange"));
    expect(mockCmds.execRejectChange).toHaveBeenCalledOnce();
  });

  it("点击下一处修订调用 execFindNextChange", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-nextChange"));
    expect(mockCmds.execFindNextChange).toHaveBeenCalledOnce();
  });

  it("点击上一处修订调用 execFindPreviousChange", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-previousChange"));
    expect(mockCmds.execFindPreviousChange).toHaveBeenCalledOnce();
  });

  // === 5.3 全部接受/拒绝 / Accept all / Reject all ===
  it("渲染全部更改组", () => {
    render(<ReviewTab {...props} />);
    expect(screen.getByText("ribbon.group.allChanges")).toBeInTheDocument();
  });

  it("点击全部接受调用 execAcceptAllChanges", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-acceptAllChanges"));
    expect(mockCmds.execAcceptAllChanges).toHaveBeenCalledOnce();
  });

  it("点击全部拒绝调用 execRejectAllChanges", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-rejectAllChanges"));
    expect(mockCmds.execRejectAllChanges).toHaveBeenCalledOnce();
  });
});
