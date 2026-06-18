// MenuBar.test.tsx — 菜单栏测试
// Reference: .dev/plan/implementation-plan.md §Phase 2

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuBar } from "../menu-bar";

// Mock useT
vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));

// Mock cn
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

// Mock stores
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn(() => null),
}));

// Mock commands
vi.mock("@/features/editor/commands", () => ({
  execUndo: vi.fn(),
  execRedo: vi.fn(),
  execToggleMark: vi.fn(),
  execInsertTable: vi.fn(),
  execInsertImage: vi.fn(),
  execInsertLink: vi.fn(),
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
};

describe("MenuBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("渲染所有菜单组", () => {
    render(<MenuBar {...defaultProps} />);
    expect(screen.getByTestId("menu-bar")).toBeTruthy();
    expect(screen.getByTestId("menu-file")).toBeTruthy();
    expect(screen.getByTestId("menu-edit")).toBeTruthy();
    expect(screen.getByTestId("menu-view")).toBeTruthy();
    expect(screen.getByTestId("menu-insert")).toBeTruthy();
    expect(screen.getByTestId("menu-format")).toBeTruthy();
    expect(screen.getByTestId("menu-agent")).toBeTruthy();
    expect(screen.getByTestId("menu-help")).toBeTruthy();
  });

  it("点击菜单组展开下拉", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    expect(screen.getByTestId("menu-dropdown-file")).toBeTruthy();
  });

  it("再次点击菜单组关闭下拉", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    expect(screen.getByTestId("menu-dropdown-file")).toBeTruthy();
    fireEvent.click(screen.getByTestId("menu-file"));
    expect(screen.queryByTestId("menu-dropdown-file")).toBeNull();
  });

  it("切换菜单组", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    expect(screen.getByTestId("menu-dropdown-file")).toBeTruthy();
    fireEvent.click(screen.getByTestId("menu-edit"));
    expect(screen.queryByTestId("menu-dropdown-file")).toBeNull();
    expect(screen.getByTestId("menu-dropdown-edit")).toBeTruthy();
  });

  it("点击 Escape 关闭下拉", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    expect(screen.getByTestId("menu-dropdown-file")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("menu-dropdown-file")).toBeNull();
  });

  it("文件菜单新建触发 onNew", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    fireEvent.click(screen.getByTestId("menu-item-file:new"));
    expect(defaultProps.onNew).toHaveBeenCalledOnce();
  });

  it("文件菜单打开触发 onOpen", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    fireEvent.click(screen.getByTestId("menu-item-file:open"));
    expect(defaultProps.onOpen).toHaveBeenCalledOnce();
  });

  it("编辑菜单撤销调用 execUndo", async () => {
    const { execUndo } = await import("@/features/editor/commands");
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-edit"));
    fireEvent.click(screen.getByTestId("menu-item-edit:undo"));
    expect(execUndo).toHaveBeenCalledOnce();
  });

  it("编辑菜单重做调用 execRedo", async () => {
    const { execRedo } = await import("@/features/editor/commands");
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-edit"));
    fireEvent.click(screen.getByTestId("menu-item-edit:redo"));
    expect(execRedo).toHaveBeenCalledOnce();
  });

  it("视图菜单缩放触发 onZoomIn/onZoomOut", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-view"));
    fireEvent.click(screen.getByTestId("menu-item-view:zoomIn"));
    expect(defaultProps.onZoomIn).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTestId("menu-view"));
    fireEvent.click(screen.getByTestId("menu-item-view:zoomOut"));
    expect(defaultProps.onZoomOut).toHaveBeenCalledOnce();
  });

  it("视图菜单切换大纲触发 onToggleOutline", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-view"));
    fireEvent.click(screen.getByTestId("menu-item-view:toggleOutline"));
    expect(defaultProps.onToggleOutline).toHaveBeenCalledOnce();
  });

  it("Agent 菜单项高亮显示", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-agent"));
    const item = screen.getByTestId("menu-item-agent:togglePanel");
    // Agent 菜单项应该高亮（有 text-primary 类）
    expect(item.className).toContain("text-primary");
    // 点击应该关闭下拉菜单
    fireEvent.click(item);
    expect(screen.queryByTestId("menu-dropdown-agent")).toBeNull();
  });

  it("显示快捷键文本", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    const dropdown = screen.getByTestId("menu-dropdown-file");
    expect(dropdown.textContent).toContain("⌘N");
    expect(dropdown.textContent).toContain("⌘O");
  });

  it("下拉中有分隔线", () => {
    render(<MenuBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("menu-file"));
    const dropdown = screen.getByTestId("menu-dropdown-file");
    // 分隔线是 h-px 的 div
    const separators = dropdown.querySelectorAll(".h-px");
    expect(separators.length).toBeGreaterThan(0);
  });
});
