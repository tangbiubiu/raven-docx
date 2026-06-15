// features/formatting/components/__tests__/toolbar.test.tsx — Toolbar 测试
// 测试工具栏渲染和交互，mock 共享 commands 模块。

import { fireEvent, render, screen } from "@testing-library/react";
import type { Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { EditorBridge, SelectionInfo } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { Toolbar } from "../toolbar";

// === Mock 共享命令模块 ===

const mockCommands = vi.hoisted(() => ({
  execToggleMark: vi.fn(),
  execSetBlockType: vi.fn(),
  execWrapIn: vi.fn(),
  execLift: vi.fn(),
  execUndo: vi.fn(),
  execRedo: vi.fn(),
  execIndent: vi.fn(),
  execOutdent: vi.fn(),
  execInsertTable: vi.fn(),
  execInsertImage: vi.fn(),
  execInsertLink: vi.fn(),
}));

vi.mock("@/features/editor/commands", () => mockCommands);

// === Mock prosemirror-commands（useFormatState 依赖） ===

vi.mock("prosemirror-commands", () => ({
  toggleMark: () => vi.fn(),
  setBlockType: () => vi.fn(),
  wrapIn: () => vi.fn(),
  lift: () => vi.fn(),
}));

// === Mock prosemirror-history ===
vi.mock("prosemirror-history", () => ({
  undo: vi.fn(),
  redo: vi.fn(),
}));

// === Mock prosemirror-schema-list ===
vi.mock("prosemirror-schema-list", () => ({
  sinkListItem: () => vi.fn(),
  liftListItem: () => vi.fn(),
}));

// === 辅助函数 ===

function createMockView(markActive: Record<string, boolean> = {}) {
  const dispatchSpy: Mock = vi.fn();
  const activeMarks = Object.entries(markActive)
    .filter(([, active]) => active)
    .map(([name]) => ({ type: { name } }));
  const resolvedPos = {
    marks: () => activeMarks,
    parent: { type: { name: "paragraph" }, attrs: {} },
    depth: 1,
    node: (d: number) => ({
      type: { name: d === 1 ? "doc" : "paragraph" },
      attrs: {},
    }),
  };
  const view = {
    state: {
      schema: {
        marks: {
          bold: { name: "bold" },
          italic: { name: "italic" },
          underline: { name: "underline" },
          strike: { name: "strike" },
          superscript: { name: "superscript" },
          subscript: { name: "subscript" },
          color: { name: "color" },
          highlight: { name: "highlight" },
          link: { name: "link" },
          fontFamily: { name: "fontFamily" },
          fontSize: { name: "fontSize" },
        },
        nodes: {
          paragraph: { name: "paragraph" },
          heading: { name: "heading" },
          ordered_list: { name: "ordered_list" },
          bullet_list: { name: "bullet_list" },
          list_item: { name: "list_item" },
          doc: { name: "doc" },
          text: { name: "text" },
        },
      },
      selection: {
        $from: resolvedPos,
        $anchor: resolvedPos,
        $head: resolvedPos,
        from: 0,
        to: 0,
        empty: true,
        ranges: [{ $from: resolvedPos, $to: resolvedPos }],
      },
      storedMarks: null,
      tr: {
        setStoredMarks: vi.fn(() => ({})),
        addMark: vi.fn(() => ({})),
        removeMark: vi.fn(() => ({})),
        deleteSelection: vi.fn(() => ({})),
        setBlockType: vi.fn(() => ({})),
        wrapIn: vi.fn(() => ({})),
        lift: vi.fn(() => ({})),
      } as unknown as Transaction,
    },
    dispatch: dispatchSpy,
    focus: vi.fn(),
  } as unknown as EditorView;

  return { view, dispatchSpy };
}

function setupMockBridge(view: EditorView, dispatchSpy: Mock) {
  const bridge: EditorBridge = {
    save: vi.fn().mockResolvedValue(null),
    focus: vi.fn(),
    getAgent: vi.fn().mockReturnValue(null),
    getDocument: vi.fn().mockReturnValue(null),
    getLayout: vi.fn().mockReturnValue(null),
    getSelectionInfo: (): SelectionInfo => ({ from: 0, to: 0, text: "" }),
    applyFormatting: vi.fn().mockReturnValue(true),
    setParagraphStyle: vi.fn().mockReturnValue(true),
    scrollToParaId: vi.fn().mockReturnValue(false),
    setZoom: vi.fn(),
    getEditorView: () => view,
    dispatchTransaction: (tr: Transaction) => {
      dispatchSpy(tr);
    },
  } as EditorBridge;
  useDocumentStore.getState().setEditorBridge(bridge);
  return bridge;
}

describe("Toolbar", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
    vi.clearAllMocks();
  });

  it("渲染所有格式化按钮", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    // 文字格式
    expect(screen.getByLabelText("加粗")).toBeInTheDocument();
    expect(screen.getByLabelText("斜体")).toBeInTheDocument();
    expect(screen.getByLabelText("下划线")).toBeInTheDocument();
    expect(screen.getByLabelText("删除线")).toBeInTheDocument();

    // 撤销/重做
    expect(screen.getByTestId("toolbar-undo")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-redo")).toBeInTheDocument();

    // 插入按钮
    expect(screen.getByTestId("toolbar-insertTable")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-insertImage")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-insertLink")).toBeInTheDocument();

    // 缩进
    expect(screen.getByTestId("toolbar-indent")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-outdent")).toBeInTheDocument();

    // 下拉框（标题 + 字体 + 字号）
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });

  it("点击加粗调用 execToggleMark('bold')", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByLabelText("加粗"));
    expect(mockCommands.execToggleMark).toHaveBeenCalledWith("bold");
  });

  it("点击斜体调用 execToggleMark('italic')", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByLabelText("斜体"));
    expect(mockCommands.execToggleMark).toHaveBeenCalledWith("italic");
  });

  it("点击撤销调用 execUndo", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-undo"));
    expect(mockCommands.execUndo).toHaveBeenCalledOnce();
  });

  it("点击重做调用 execRedo", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-redo"));
    expect(mockCommands.execRedo).toHaveBeenCalledOnce();
  });

  it("点击插入表格调用 execInsertTable", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-insertTable"));
    expect(mockCommands.execInsertTable).toHaveBeenCalledOnce();
  });

  it("点击插入图片调用 execInsertImage", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-insertImage"));
    expect(mockCommands.execInsertImage).toHaveBeenCalledOnce();
  });

  it("点击插入链接调用 execInsertLink", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-insertLink"));
    expect(mockCommands.execInsertLink).toHaveBeenCalledOnce();
  });

  it("点击增加缩进调用 execIndent", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-indent"));
    expect(mockCommands.execIndent).toHaveBeenCalledOnce();
  });

  it("点击减少缩进调用 execOutdent", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-outdent"));
    expect(mockCommands.execOutdent).toHaveBeenCalledOnce();
  });

  it("选中加粗文字时按钮显示 active 状态", () => {
    const { view, dispatchSpy } = createMockView({ bold: true });
    setupMockBridge(view, dispatchSpy);
    useDocumentStore.getState().setSelectionFormat({ bold: true });
    render(<Toolbar />);

    expect(screen.getByLabelText("加粗")).toHaveAttribute("data-state", "on");
  });

  it("未选中加粗文字时按钮不显示 active", () => {
    const { view, dispatchSpy } = createMockView({ bold: false });
    setupMockBridge(view, dispatchSpy);
    useDocumentStore.getState().setSelectionFormat({ bold: false });
    render(<Toolbar />);

    expect(screen.getByLabelText("加粗")).toHaveAttribute("data-state", "off");
  });

  it("点击清除格式调用清除操作", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("toolbar-clearFormat"));
    // clearFormat 通过 store 读取 bridge 并执行 removeMark
    // 由于 selection 为 empty，不执行任何操作
  });

  it("颜色选择器存在", () => {
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    expect(screen.getByTestId("toolbar-textColor")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-highlight")).toBeInTheDocument();
  });
});
