// src/features/ribbon/components/__tests__/tabs/ViewTab.test.tsx — ViewTab 测试 / ViewTab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ViewTab } from "../../tabs/ViewTab";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params && key === "ribbon.label.zoomPercent") {
        return `${params.percent}%`;
      }
      return key;
    },
  }),
}));
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

// useAppStore mock — rulerVisible + toggleRuler
const mockAppStore = vi.hoisted(() => ({
  rulerVisible: false,
  toggleRuler: vi.fn(),
}));
vi.mock("@/stores/useAppStore", () => ({
  useAppStore: vi.fn((selector?: (s: typeof mockAppStore) => unknown) =>
    typeof selector === "function" ? selector(mockAppStore) : mockAppStore
  ),
}));

// useDocumentStore mock — zoom + editorBridge(openPrintPreview/print)
const openPrintPreviewMock = vi.fn();
const printMock = vi.fn();
const mockDocState = {
  zoom: 100,
  editorBridge: {
    openPrintPreview: openPrintPreviewMock,
    print: printMock,
  } as unknown,
};
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn((selector?: (s: typeof mockDocState) => unknown) =>
    typeof selector === "function" ? selector(mockDocState) : mockDocState
  ),
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

describe("ViewTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染视图/缩放/Agent 组", () => {
    render(<ViewTab {...props} />);
    expect(screen.getByText("ribbon.group.view")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.zoom")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.agent")).toBeInTheDocument();
  });

  it("点击大纲切换触发 onToggleOutline", () => {
    render(<ViewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-toggleOutline"));
    expect(props.onToggleOutline).toHaveBeenCalled();
  });

  it("点击放大触发 onZoomIn", () => {
    render(<ViewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-zoomIn"));
    expect(props.onZoomIn).toHaveBeenCalled();
  });

  it("点击 Agent 面板切换触发 onToggleAgentSidebar", () => {
    render(<ViewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-toggleAgentSidebar"));
    expect(props.onToggleAgentSidebar).toHaveBeenCalled();
  });

  // === 5.4 标尺切换 / Ruler toggle ===
  it("渲染标尺 toggle 按钮,初始未激活", () => {
    mockAppStore.rulerVisible = false;
    render(<ViewTab {...props} />);
    const btn = screen.getByTestId("ribbon-toggleRuler");
    expect(btn).toHaveAttribute("data-pressed", "false");
  });

  it("rulerVisible 为 true 时标尺按钮 data-pressed 为 true", () => {
    mockAppStore.rulerVisible = true;
    render(<ViewTab {...props} />);
    const btn = screen.getByTestId("ribbon-toggleRuler");
    expect(btn).toHaveAttribute("data-pressed", "true");
  });

  it("点击标尺按钮调用 toggleRuler", () => {
    mockAppStore.rulerVisible = false;
    render(<ViewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-toggleRuler"));
    expect(mockAppStore.toggleRuler).toHaveBeenCalledOnce();
  });

  // === 5.5 缩放百分比显示 / Zoom percentage display ===
  it("显示当前 zoom 百分比", () => {
    mockDocState.zoom = 100;
    render(<ViewTab {...props} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("zoom 变化时百分比文本随之更新", () => {
    mockDocState.zoom = 150;
    render(<ViewTab {...props} />);
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  // === 5.6 打印预览 / Print preview ===
  it("渲染打印组", () => {
    render(<ViewTab {...props} />);
    expect(screen.getByText("ribbon.group.print")).toBeInTheDocument();
  });

  it("点击打印预览调用 editorBridge.openPrintPreview", () => {
    render(<ViewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-printPreview"));
    expect(openPrintPreviewMock).toHaveBeenCalledOnce();
  });

  // === 5.7 打印 / Print ===
  it("点击打印调用 editorBridge.print", () => {
    render(<ViewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-print"));
    expect(printMock).toHaveBeenCalledOnce();
  });
});
