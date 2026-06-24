// src/features/ribbon/components/__tests__/Ribbon.test.tsx — Ribbon 容器测试 / Ribbon container tests
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));
// Phase 7.2: mock 懒加载的标签页，避免动态 import 在测试中的异步复杂性
vi.mock("../tabs/HomeTab", () => ({
  HomeTab: () => <div data-testid="home-panel" />,
}));
vi.mock("../tabs/InsertTab", () => ({
  InsertTab: () => <div data-testid="insert-panel" />,
}));
vi.mock("../tabs/LayoutTab", () => ({
  LayoutTab: () => <div data-testid="layout-panel" />,
}));
vi.mock("../tabs/ReferencesTab", () => ({
  ReferencesTab: () => <div data-testid="references-panel" />,
}));
vi.mock("../tabs/ReviewTab", () => ({
  ReviewTab: () => <div data-testid="review-panel" />,
}));
vi.mock("../tabs/ViewTab", () => ({
  ViewTab: () => <div data-testid="view-panel" />,
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

  it("宽屏显示面板区域", async () => {
    mockUseMediaQuery.mockReturnValue(true);
    render(<Ribbon {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    });
  });

  it("窄屏(<768px)隐藏面板区域", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
  });

  it("窄屏点击标签弹出浮层面板", async () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("ribbon.tab.home"));
    await waitFor(() => {
      expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    });
  });

  it("窄屏浮层中点击其他标签切换并保持浮层打开", async () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    fireEvent.click(screen.getByText("ribbon.tab.home"));
    await waitFor(() => {
      expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("ribbon.tab.insert"));
    await waitFor(() => {
      expect(screen.getByTestId("insert-panel")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
  });

  it("窄屏浮层 Escape 关闭", async () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(<Ribbon {...defaultProps} />);
    fireEvent.click(screen.getByText("ribbon.tab.home"));
    await waitFor(() => {
      expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("home-panel")).not.toBeInTheDocument();
  });

  it("懒加载激活标签页面板", async () => {
    render(<Ribbon {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId("home-panel")).toBeInTheDocument();
    });
  });

  it("切换标签页后加载对应面板", async () => {
    render(<Ribbon {...defaultProps} />);
    fireEvent.click(screen.getByText("ribbon.tab.view"));
    await waitFor(() => {
      expect(screen.getByTestId("view-panel")).toBeInTheDocument();
    });
  });

  // Phase 7.6: aria 关联
  it("tab 按钮有 id 且 panel 有 aria-labelledby 指向激活 tab", () => {
    render(<Ribbon {...defaultProps} />);
    const homeBtn = screen.getByText("ribbon.tab.home").closest("button");
    expect(homeBtn).toHaveAttribute("id", "ribbon-tab-home");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "ribbon-tab-home");
  });

  // Phase 7.4: roving tabindex — 激活 tab 可聚焦，其余 tabIndex=-1
  it("激活标签页 tabIndex=0，其余为 -1", () => {
    render(<Ribbon {...defaultProps} />);
    const homeBtn = screen.getByText("ribbon.tab.home").closest("button");
    const insertBtn = screen.getByText("ribbon.tab.insert").closest("button");
    expect(homeBtn).toHaveAttribute("tabindex", "0");
    expect(insertBtn).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight/ArrowLeft 切换标签页", () => {
    render(<Ribbon {...defaultProps} />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(
      screen.getByText("ribbon.tab.insert").closest("button")
    ).toHaveAttribute("data-active", "true");
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(
      screen.getByText("ribbon.tab.home").closest("button")
    ).toHaveAttribute("data-active", "true");
  });
});
