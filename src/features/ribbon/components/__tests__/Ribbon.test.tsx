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
});
