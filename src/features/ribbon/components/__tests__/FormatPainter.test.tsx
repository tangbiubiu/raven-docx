// src/features/ribbon/components/__tests__/FormatPainter.test.tsx — FormatPainter 测试
// 验证:点击采集快照、激活后仅非空选区触发应用、光标移动不触发、Esc 取消。
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormatPainter } from "../FormatPainter";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

// mock 采集/应用逻辑(组件依赖,验证调用与参数)
const mockLogic = vi.hoisted(() => ({
  collectFormatPainterSnapshot: vi.fn(() => ({ text: {} })),
  applySnapshot: vi.fn(),
}));
vi.mock("../format-painter-logic", () => mockLogic);

// mock useFormatPainterStore with controllable state
const mockPainterState = {
  marks: null as Record<string, unknown> | null,
  active: false,
  setFormatPainter: vi.fn(),
  clearFormatPainter: vi.fn(),
};
vi.mock("@/stores/useFormatPainterStore", () => ({
  useFormatPainterStore: vi.fn(
    (selector?: (s: typeof mockPainterState) => unknown) =>
      typeof selector === "function"
        ? selector(mockPainterState)
        : mockPainterState
  ),
}));

// mock useDocumentStore:selectionFormat + selectionInfo + editorBridge
const mockDocState = {
  selectionFormat: null as Record<string, unknown> | null,
  selectionInfo: null as { from: number; to: number } | null,
};
const mockView = { state: { schema: { marks: {} } } };
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn((selector?: (s: typeof mockDocState) => unknown) =>
    typeof selector === "function" ? selector(mockDocState) : mockDocState
  ),
  // 组件用 getState() 取 editorBridge
}));

// getState 返回含 editorBridge 的快照
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: Object.assign(
    vi.fn((selector?: (s: typeof mockDocState) => unknown) =>
      typeof selector === "function" ? selector(mockDocState) : mockDocState
    ),
    {
      getState: vi.fn(() => ({
        editorBridge: { getEditorView: () => mockView },
      })),
    }
  ),
}));

describe("FormatPainter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPainterState.marks = null;
    mockPainterState.active = false;
    mockPainterState.setFormatPainter.mockImplementation((m: unknown) => {
      mockPainterState.marks = m as Record<string, unknown>;
      mockPainterState.active = true;
    });
    mockPainterState.clearFormatPainter.mockImplementation(() => {
      mockPainterState.marks = null;
      mockPainterState.active = false;
    });
    mockDocState.selectionFormat = null;
    mockDocState.selectionInfo = null;
  });

  it("渲染格式刷按钮", () => {
    render(<FormatPainter />);
    expect(screen.getByTestId("ribbon-formatPainter")).toBeInTheDocument();
  });

  it("未激活时 data-pressed 为 false", () => {
    render(<FormatPainter />);
    expect(screen.getByTestId("ribbon-formatPainter")).toHaveAttribute(
      "data-pressed",
      "false"
    );
  });

  it("点击调用 collectFormatPainterSnapshot 并 setFormatPainter", () => {
    mockDocState.selectionFormat = {
      bold: true,
      fontFamily: { ascii: "Calibri" },
      fontSize: 24,
    };
    render(<FormatPainter />);
    screen.getByTestId("ribbon-formatPainter").click();
    expect(mockLogic.collectFormatPainterSnapshot).toHaveBeenCalledOnce();
    expect(mockPainterState.setFormatPainter).toHaveBeenCalledOnce();
  });

  it("已激活时点击调用 clearFormatPainter(切换关闭)", () => {
    mockPainterState.marks = { text: { bold: true } };
    mockPainterState.active = true;
    render(<FormatPainter />);
    screen.getByTestId("ribbon-formatPainter").click();
    expect(mockPainterState.clearFormatPainter).toHaveBeenCalled();
    expect(mockPainterState.setFormatPainter).not.toHaveBeenCalled();
  });

  it("按 Escape 取消格式刷", () => {
    mockPainterState.marks = { text: { bold: true } };
    mockPainterState.active = true;
    render(<FormatPainter />);
    screen.getByTestId("ribbon-formatPainter").focus();
    fireEvent.keyDown(screen.getByTestId("ribbon-formatPainter"), {
      key: "Escape",
    });
    expect(mockPainterState.clearFormatPainter).toHaveBeenCalled();
  });
  it("激活后非空选区(from!==to)→ 调用 applySnapshot 并清除", () => {
    const snapshot = { text: { bold: true } };
    mockPainterState.marks = snapshot;
    mockPainterState.active = true;
    mockDocState.selectionInfo = { from: 5, to: 10 };
    render(<FormatPainter />);
    // clearFormatPainter 会改 marks,故断言 applySnapshot 收到的是原始快照
    expect(mockLogic.applySnapshot).toHaveBeenCalledWith(snapshot);
    expect(mockPainterState.clearFormatPainter).toHaveBeenCalled();
  });

  it("激活后光标移动(from===to)→ 不调用 applySnapshot、不清除", () => {
    mockPainterState.marks = { text: { bold: true } };
    mockPainterState.active = true;
    mockDocState.selectionInfo = { from: 5, to: 5 };
    render(<FormatPainter />);
    expect(mockLogic.applySnapshot).not.toHaveBeenCalled();
    expect(mockPainterState.clearFormatPainter).not.toHaveBeenCalled();
  });
});
