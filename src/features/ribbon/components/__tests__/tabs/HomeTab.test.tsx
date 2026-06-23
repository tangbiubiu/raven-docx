// src/features/ribbon/components/__tests__/tabs/HomeTab.test.tsx — HomeTab 测试 / Home tab tests
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeTab } from "../../tabs/HomeTab";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn(() => ({ editorBridge: null })),
}));
vi.mock("@/features/formatting/hooks/use-format-state", () => ({
  useFormatState: () => ({
    isActive: () => false,
    isAlignActive: () => false,
    getHeadingLevel: () => {
      // mock: 无标题 / no heading
    },
    getListType: () => null,
  }),
}));

const mockCmds = vi.hoisted(() => ({
  execUndo: vi.fn(),
  execRedo: vi.fn(),
  execToggleMark: vi.fn(),
  execSetBlockType: vi.fn(),
  execWrapIn: vi.fn(),
  execLift: vi.fn(),
  execIndent: vi.fn(),
  execOutdent: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

const mockFormatApply = vi.hoisted(() => ({
  applyFont: vi.fn(),
  applyFontSize: vi.fn(),
  applyTextColor: vi.fn(),
  applyHighlight: vi.fn(),
  clearFormatting: vi.fn(),
}));
vi.mock("@/features/formatting/format-apply", () => mockFormatApply);

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

describe("HomeTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染撤销组", () => {
    render(<HomeTab {...props} />);
    expect(screen.getByText("ribbon.group.undo")).toBeInTheDocument();
  });

  it("渲染字体组的加粗/斜体/下划线/删除线按钮", () => {
    render(<HomeTab {...props} />);
    expect(screen.getByTestId("ribbon-bold")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-italic")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-underline")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-strikethrough")).toBeInTheDocument();
  });

  it("渲染段落组的对齐和列表按钮", () => {
    render(<HomeTab {...props} />);
    expect(screen.getByTestId("ribbon-alignLeft")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-alignCenter")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-orderedList")).toBeInTheDocument();
    expect(screen.getByTestId("ribbon-unorderedList")).toBeInTheDocument();
  });

  it("点击撤销调用 execUndo", () => {
    render(<HomeTab {...props} />);
    screen.getByTestId("ribbon-undo").click();
    expect(mockCmds.execUndo).toHaveBeenCalled();
  });

  it("点击加粗调用 execToggleMark", () => {
    render(<HomeTab {...props} />);
    screen.getByTestId("ribbon-bold").click();
    expect(mockCmds.execToggleMark).toHaveBeenCalledWith("bold");
  });
});
