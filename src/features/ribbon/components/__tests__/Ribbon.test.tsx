// src/features/ribbon/components/__tests__/Ribbon.test.tsx — Ribbon 容器测试 / Ribbon container tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { Ribbon } from "../Ribbon";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

// mock 各 Tab 组件,避免引入大量真实依赖
vi.mock("../tabs/HomeTab", () => ({
  HomeTab: () => <div data-testid="home-panel">home</div>,
}));
vi.mock("../tabs/InsertTab", () => ({
  InsertTab: () => <div data-testid="insert-panel">insert</div>,
}));
vi.mock("../tabs/LayoutTab", () => ({
  LayoutTab: () => <div data-testid="layout-panel">layout</div>,
}));
vi.mock("../tabs/ReferencesTab", () => ({
  ReferencesTab: () => <div data-testid="references-panel">references</div>,
}));
vi.mock("../tabs/ReviewTab", () => ({
  ReviewTab: () => <div data-testid="review-panel">review</div>,
}));
vi.mock("../tabs/ViewTab", () => ({
  ViewTab: () => <div data-testid="view-panel">view</div>,
}));

// useMediaQuery mock: 默认宽屏(matches=true)
const mockUseMediaQuery = vi.fn((_q: string) => true);
vi.mock("@/features/ribbon/hooks/use-media-query", () => ({
  useMediaQuery: (q: string) => mockUseMediaQuery(q),
}));

const defaultProps = {
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

describe("Ribbon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(true);
    useAppStore.setState({ activeRibbonTab: "home" });
  });

  it("渲染所有标签页按钮", () => {
    render(<Ribbon {...defaultProps} />);
    expect(screen.getByText("ribbon.tab.home")).toBeInTheDocument();
    expect(screen.getByText("ribbon.tab.insert")).toBeInTheDocument();
    expect(screen.getByText("ribbon.tab.layout")).toBeInTheDocument();
    expect(screen.getByText("ribbon.tab.references")).toBeInTheDocument();
    expect(screen.getByText("ribbon.tab.review")).toBeInTheDocument();
    expect(screen.getByText("ribbon.tab.view")).toBeInTheDocument();
  });

  it("默认激活开始标签页", () => {
    render(<Ribbon {...defaultProps} />);
    const homeTab = screen.getByText("ribbon.tab.home");
    expect(homeTab.closest("button")).toHaveAttribute("data-active", "true");
  });

  it("点击标签页切换激活态", () => {
    render(<Ribbon {...defaultProps} />);
    fireEvent.click(screen.getByText("ribbon.tab.insert"));
    expect(
      screen.getByText("ribbon.tab.insert").closest("button")
    ).toHaveAttribute("data-active", "true");
  });

  it("宽屏显示面板区域", () => {
    mockUseMediaQuery.mockReturnValue(true);
    render(<Ribbon {...defaultProps} />);
    expect(screen.getByTestId("home-panel")).toBeInTheDocument();
  });

  it("窄屏(<768px)隐藏面板区域", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
  });

  it("窄屏点击标签弹出浮层面板", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("ribbon.tab.home"));
    expect(screen.getByTestId("home-panel")).toBeInTheDocument();
  });

  it("窄屏浮层中点击其他标签切换并保持浮层打开", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    fireEvent.click(screen.getByText("ribbon.tab.home"));
    expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByText("ribbon.tab.insert"));
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("insert-panel")).toBeInTheDocument();
  });

  it("窄屏浮层 Escape 关闭", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    fireEvent.click(screen.getByText("ribbon.tab.home"));
    expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
  });
});
