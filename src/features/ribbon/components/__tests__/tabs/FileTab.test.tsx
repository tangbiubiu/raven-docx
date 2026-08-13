// src/features/ribbon/components/__tests__/tabs/FileTab.test.tsx — 文件标签页测试 / File tab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileTab } from "../../tabs/FileTab";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

// useAppStore mock — setActiveRibbonTab
const setActiveRibbonTab = vi.fn();
vi.mock("@/stores/useAppStore", () => ({
  useAppStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = { setActiveRibbonTab };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

describe("FileTab", () => {
  const onNew = vi.fn();
  const onOpen = vi.fn();
  const onSave = vi.fn();

  // FileTab 的 props 是完整 RibbonCallbacks,其余回调用 no-op 占位
  const callbacks = () => ({
    onNew,
    onOpen,
    onSave,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onToggleOutline: vi.fn(),
    onToggleAgentSidebar: vi.fn(),
    onPageSetup: vi.fn(),
    onHeaderFooter: vi.fn(),
    onNewComment: vi.fn(),
    onInsertPageBreak: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the four file actions", () => {
    render(<FileTab {...callbacks()} />);
    expect(screen.getByText("menu.file.new")).toBeTruthy();
    expect(screen.getByText("menu.file.open")).toBeTruthy();
    expect(screen.getByText("menu.file.save")).toBeTruthy();
    expect(screen.getByText("menu.file.saveAs")).toBeTruthy();
  });

  it("executes the action and closes the menu on click", () => {
    render(<FileTab {...callbacks()} />);
    fireEvent.click(screen.getByText("menu.file.open"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(setActiveRibbonTab).toHaveBeenCalledWith("home");
  });

  it("maps saveAs to the save callback (alias, not a real save-as)", () => {
    render(<FileTab {...callbacks()} />);
    fireEvent.click(screen.getByText("menu.file.saveAs"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("closes the menu when clicking outside", () => {
    render(<FileTab {...callbacks()} />);
    fireEvent.mouseDown(document.body);
    expect(setActiveRibbonTab).toHaveBeenCalledWith("home");
  });
});
