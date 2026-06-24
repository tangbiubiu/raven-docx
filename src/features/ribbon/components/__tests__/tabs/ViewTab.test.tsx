// src/features/ribbon/components/__tests__/tabs/ViewTab.test.tsx — ViewTab 测试 / ViewTab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ViewTab } from "../../tabs/ViewTab";

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
});
