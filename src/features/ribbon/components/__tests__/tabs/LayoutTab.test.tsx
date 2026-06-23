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

describe("LayoutTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染页面设置/页眉页脚/缩进组", () => {
    render(<LayoutTab {...props} />);
    expect(screen.getByText("ribbon.group.pageSetup")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.headerFooter")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.indent")).toBeInTheDocument();
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

  it("点击增加缩进调用 execIndent", () => {
    render(<LayoutTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-indent"));
    expect(mockCmds.execIndent).toHaveBeenCalled();
  });
});
