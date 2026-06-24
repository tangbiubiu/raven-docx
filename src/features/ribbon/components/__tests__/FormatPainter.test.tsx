// src/features/ribbon/components/__tests__/FormatPainter.test.tsx — FormatPainter 测试 / FormatPainter tests
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

const mockCmds = vi.hoisted(() => ({
  execToggleMark: vi.fn(),
  execSetFontFamily: vi.fn(),
  execSetFontSize: vi.fn(),
  execSetTextColor: vi.fn(),
  execSetHighlight: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

// mock useFormatPainterStore + useDocumentStore with controllable state
const mockPainterState = {
  marks: null as Record<string, unknown> | null,
  active: false,
  setFormatPainter: vi.fn(),
  clearFormatPainter: vi.fn(),
};
vi.mock("@/stores/useFormatPainterStore", () => ({
  useFormatPainterStore: vi.fn(
    (selector?: (s: typeof mockPainterState) => unknown) =>
      typeof selector === "function" ? selector(mockPainterState) : mockPainterState,
  ),
}));

const mockDocState = {
  selectionFormat: null as Record<string, unknown> | null,
};
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn((selector?: (s: typeof mockDocState) => unknown) =>
    typeof selector === "function" ? selector(mockDocState) : mockDocState
  ),
}));

describe("FormatPainter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPainterState.marks = null;
    mockPainterState.active = false;
    mockDocState.selectionFormat = null;
  });

  it("渲染格式刷按钮", () => {
    render(<FormatPainter />);
    expect(screen.getByTestId("ribbon-formatPainter")).toBeInTheDocument();
  });

  it("未激活时 data-pressed 为 false", () => {
    render(<FormatPainter />);
    expect(screen.getByTestId("ribbon-formatPainter")).toHaveAttribute(
      "data-pressed",
      "false",
    );
  });

  it("激活时 data-pressed 为 true", () => {
    mockPainterState.marks = { bold: true };
    mockPainterState.active = true;
    render(<FormatPainter />);
    expect(screen.getByTestId("ribbon-formatPainter")).toHaveAttribute(
      "data-pressed",
      "true",
    );
  });

  it("点击调用 setFormatPainter 传入当前选区 marks 快照", () => {
    mockDocState.selectionFormat = {
      bold: true,
      italic: false,
      underline: true,
      strike: false,
      fontFamily: "Georgia",
      fontSize: 24,
      textColor: "#FF0000",
      highlight: "yellow",
      superscript: false,
      subscript: false,
    };
    render(<FormatPainter />);
    screen.getByTestId("ribbon-formatPainter").click();
    expect(mockPainterState.setFormatPainter).toHaveBeenCalledWith({
      bold: true,
      italic: false,
      underline: true,
      strike: false,
      fontFamily: "Georgia",
      fontSize: 24,
      textColor: "#FF0000",
      highlight: "yellow",
      superscript: false,
      subscript: false,
    });
  });

  it("已激活时点击调用 clearFormatPainter(切换关闭)", () => {
    mockPainterState.marks = { bold: true };
    mockPainterState.active = true;
    render(<FormatPainter />);
    screen.getByTestId("ribbon-formatPainter").click();
    expect(mockPainterState.clearFormatPainter).toHaveBeenCalled();
    expect(mockPainterState.setFormatPainter).not.toHaveBeenCalled();
  });

  it("按 Escape 取消格式刷", () => {
    mockPainterState.marks = { bold: true };
    mockPainterState.active = true;
    render(<FormatPainter />);
    screen.getByTestId("ribbon-formatPainter").focus();
    fireEvent.keyDown(screen.getByTestId("ribbon-formatPainter"), {
      key: "Escape",
    });
    expect(mockPainterState.clearFormatPainter).toHaveBeenCalled();
  });
});
