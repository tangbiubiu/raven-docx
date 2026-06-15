// biome-ignore-all lint/performance/useTopLevelRegex: test file — regex in assertions is standard
// features/formatting/components/__tests__/Toolbar.test.tsx — Toolbar 测试
// TDD: 红阶段 → 绿阶段 → 重构

import { fireEvent, render, screen } from "@testing-library/react";
import type { Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { EditorBridge, SelectionInfo } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { Toolbar } from "../toolbar";

// Mock prosemirror-commands to avoid deep ProseMirror internals.
// vi.hoisted ensures mock fns are available inside the hoisted vi.mock factory.
const { mockToggleMark, mockSetBlockType, mockWrapIn, mockLift } = vi.hoisted(
  () => {
    const mockToggleMark = vi.fn((markType: { name: string }) => {
      const cmd = vi.fn((_state: unknown, dispatch?: Mock) => {
        if (dispatch) {
          dispatch({ type: "toggleMark", markName: markType.name });
        }
        return true;
      });
      return cmd;
    });
    const mockSetBlockType = vi.fn((_nodeType: unknown, _attrs: unknown) => {
      const cmd = vi.fn().mockReturnValue(true);
      return cmd;
    });
    const mockWrapIn = vi.fn((_nodeType: unknown, _attrs: unknown) => {
      const cmd = vi.fn().mockReturnValue(true);
      return cmd;
    });
    const mockLift = vi.fn((_state: unknown, _dispatch: unknown) => true);
    return { mockToggleMark, mockSetBlockType, mockWrapIn, mockLift };
  }
);

vi.mock("prosemirror-commands", () => ({
  toggleMark: (markType: unknown) =>
    mockToggleMark(markType as { name: string }),
  setBlockType: (nodeType: unknown, attrs?: unknown) =>
    mockSetBlockType(nodeType, attrs),
  wrapIn: (nodeType: unknown, attrs?: unknown) => mockWrapIn(nodeType, attrs),
  lift: (state: unknown, dispatch?: unknown) => mockLift(state, dispatch),
}));

/**
 * 创建 mock EditorView 用于测试格式命令分发。
 */
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
          textColor: { name: "textColor" },
          highlight: { name: "highlight" },
          link: { name: "link" },
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

/** 注入 mock EditorBridge 到 store */
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

    // 文字格式按钮
    expect(screen.getByLabelText("加粗")).toBeInTheDocument();
    expect(screen.getByLabelText("斜体")).toBeInTheDocument();
    expect(screen.getByLabelText("下划线")).toBeInTheDocument();

    // 标题下拉 — 有多个 Select combobox (字体/字号/标题)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });

  it("点击加粗按钮分发 toggleMark bold", () => {
    mockToggleMark.mockClear();
    const { view, dispatchSpy } = createMockView();
    setupMockBridge(view, dispatchSpy);
    render(<Toolbar />);

    fireEvent.click(screen.getByLabelText("加粗"));
    // toggleMark 被调用，参数为 bold mark type
    expect(mockToggleMark).toHaveBeenCalledWith({ name: "bold" });
    // dispatch 被调用
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it("选中加粗文字时加粗按钮显示 active 状态", () => {
    const { view, dispatchSpy } = createMockView({ bold: true });
    setupMockBridge(view, dispatchSpy);
    // Toolbar reads selectionFormat from store, not directly from PM view
    useDocumentStore.getState().setSelectionFormat({ bold: true });
    render(<Toolbar />);

    const boldButton = screen.getByLabelText("加粗");
    expect(boldButton).toHaveAttribute("data-state", "on");
  });

  it("未选中加粗文字时加粗按钮不显示 active", () => {
    const { view, dispatchSpy } = createMockView({ bold: false });
    setupMockBridge(view, dispatchSpy);
    useDocumentStore.getState().setSelectionFormat({ bold: false });
    render(<Toolbar />);

    const boldButton = screen.getByLabelText("加粗");
    expect(boldButton).toHaveAttribute("data-state", "off");
  });
});
