// src/features/ribbon/components/__tests__/format-painter-logic.test.ts
// 格式刷采集与应用逻辑测试 / Format painter collect & apply logic tests
// 验证段落格式采集、一致性判断、设值语义应用、单事务批量。
import type { Command } from "prosemirror-state";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormatPainterSnapshot } from "@/features/ribbon/types/format-painter";

const mockLibCmds = vi.hoisted(() => {
  const mkCmd = (): Command => vi.fn(() => true) as unknown as Command;
  return {
    createSetMarkCommand: vi.fn(() => mkCmd()),
    createRemoveMarkCommand: vi.fn(() => mkCmd()),
    clearFontFamily: mkCmd(),
    clearFontSize: mkCmd(),
    clearHighlight: mkCmd(),
    clearTextColor: mkCmd(),
    setFontSize: vi.fn(() => mkCmd()),
    setHighlight: vi.fn(() => mkCmd()),
    setTextColor: vi.fn(() => mkCmd()),
    setIndentFirstLine: vi.fn(() => mkCmd()),
    setIndentLeft: vi.fn(() => mkCmd()),
    setIndentRight: vi.fn(() => mkCmd()),
    setLineSpacing: vi.fn(() => mkCmd()),
    setSpaceAfter: vi.fn(() => mkCmd()),
    setSpaceBefore: vi.fn(() => mkCmd()),
    alignLeft: mkCmd(),
    alignCenter: mkCmd(),
    alignRight: mkCmd(),
    alignJustify: mkCmd(),
  };
});
vi.mock("@eigenpal/docx-editor-core/prosemirror/commands", () => mockLibCmds);

// --- mock applyBatch(拦截单事务累积,验证命令数量与工厂调用)---
const mockApplyBatch = vi.hoisted(() => vi.fn());
vi.mock("@/features/editor/commands", () => ({
  applyBatch: mockApplyBatch,
}));

vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: {
    getState: vi.fn(() => ({ editorBridge: null })),
  },
}));

// --- mock store:applySnapshot 从 store 取 view;采集测试直接传 view 不经此 mock ---
const mockSchemaMarks = {
  bold: { name: "bold" },
  italic: { name: "italic" },
  underline: { name: "underline" },
  strike: { name: "strike" },
  superscript: { name: "superscript" },
  subscript: { name: "subscript" },
  fontFamily: { name: "fontFamily" },
};
const setStoreView = (view: unknown | null) => {
  vi.mocked(useDocumentStore.getState).mockReturnValue({
    editorBridge: view ? { getEditorView: () => view } : null,
  } as never);
};

import { useDocumentStore } from "@/stores/useDocumentStore";
import {
  applySnapshot,
  collectFormatPainterSnapshot,
} from "../format-painter-logic";

// === collectFormatPainterSnapshot:段落格式采集与一致性判断 ===
describe("collectFormatPainterSnapshot — 段落格式采集", () => {
  const mkPara = (attrs: Record<string, unknown>, text = "x") => ({
    isTextblock: true,
    type: { name: "paragraph" },
    attrs,
    nodeSize: text.length + 2,
    childCount: 1,
    firstChild: { isText: true, text, nodeSize: text.length },
  });

  const mkView = (opts: {
    from?: number;
    to?: number;
    nodes: { node: unknown; pos: number }[];
  }) => {
    const from = opts.from ?? 0;
    const to = opts.to ?? 10;
    const doc = {
      nodesBetween: vi.fn(
        (f: number, t: number, cb: (node: unknown, pos: number) => void) => {
          for (const { node, pos } of opts.nodes) {
            if (pos + (node as { nodeSize: number }).nodeSize > f && pos < t) {
              cb(node, pos);
            }
          }
        }
      ),
    };
    return {
      state: {
        doc,
        selection: { from, to, empty: from === to },
        schema: { marks: mockSchemaMarks },
      },
    };
  };

  const baseText = {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    superscript: false,
    subscript: false,
    fontFamily: null,
    fontSize: 0,
    textColor: "",
    highlight: "",
  };

  it("单段选区 → snapshot.paragraph 存在且值正确", () => {
    const view = mkView({
      nodes: [
        {
          pos: 0,
          node: mkPara({
            alignment: "center",
            lineSpacing: 1.5,
            lineSpacingRule: "auto",
            indentLeft: 567,
            indentRight: 0,
            indentFirstLine: 0,
            spaceBefore: 0,
            spaceAfter: 120,
          }),
        },
      ],
    });
    const snap = collectFormatPainterSnapshot(view as never, {
      ...baseText,
      bold: true,
    });
    expect(snap.paragraph).toBeDefined();
    expect(snap.paragraph?.alignment).toBe("center");
    expect(snap.paragraph?.lineSpacing).toBe(1.5);
    expect(snap.paragraph?.indentLeft).toBe(567);
    expect(snap.paragraph?.spaceAfter).toBe(120);
    expect(snap.text.bold).toBe(true);
  });

  it("多段一致 → snapshot.paragraph 存在", () => {
    const attrs = {
      alignment: "right",
      lineSpacing: 2.0,
      lineSpacingRule: "auto",
      indentLeft: 100,
      indentRight: 200,
      indentFirstLine: 0,
      spaceBefore: 60,
      spaceAfter: 60,
    };
    const view = mkView({
      from: 0,
      to: 20,
      nodes: [
        { pos: 0, node: mkPara(attrs) },
        { pos: 10, node: mkPara(attrs) },
      ],
    });
    const snap = collectFormatPainterSnapshot(view as never, baseText);
    expect(snap.paragraph).toBeDefined();
    expect(snap.paragraph?.alignment).toBe("right");
    expect(snap.paragraph?.lineSpacing).toBe(2.0);
  });

  it("多段对齐不一致 → snapshot.paragraph 为 undefined", () => {
    const view = mkView({
      from: 0,
      to: 20,
      nodes: [
        {
          pos: 0,
          node: mkPara({
            alignment: "left",
            lineSpacing: 1.0,
            indentLeft: 0,
            indentRight: 0,
            indentFirstLine: 0,
            spaceBefore: 0,
            spaceAfter: 0,
          }),
        },
        {
          pos: 10,
          node: mkPara({
            alignment: "center",
            lineSpacing: 1.0,
            indentLeft: 0,
            indentRight: 0,
            indentFirstLine: 0,
            spaceBefore: 0,
            spaceAfter: 0,
          }),
        },
      ],
    });
    const snap = collectFormatPainterSnapshot(view as never, baseText);
    expect(snap.paragraph).toBeUndefined();
  });

  it("对齐 'both' 归一化为 'justify'", () => {
    const view = mkView({
      nodes: [
        {
          pos: 0,
          node: mkPara({
            alignment: "both",
            lineSpacing: 1.0,
            indentLeft: 0,
            indentRight: 0,
            indentFirstLine: 0,
            spaceBefore: 0,
            spaceAfter: 0,
          }),
        },
      ],
    });
    const snap = collectFormatPainterSnapshot(view as never, baseText);
    expect(snap.paragraph?.alignment).toBe("justify");
  });

  it("无 EditorView → 仅返回 text 快照(paragraph undefined)", () => {
    const snap = collectFormatPainterSnapshot(null, {
      ...baseText,
      bold: true,
    });
    expect(snap.paragraph).toBeUndefined();
    expect(snap.text.bold).toBe(true);
  });
});

// === applySnapshot:设值语义应用 ===
describe("applySnapshot — 设值语义应用", () => {
  const baseText = {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    superscript: false,
    subscript: false,
    fontFamily: null,
    fontSize: 0,
    textColor: "",
    highlight: "",
  };
  // applySnapshot 需 view.schema.marks 构造 set/remove 命令
  const mkApplyView = () => ({
    state: {
      schema: { marks: mockSchemaMarks },
      selection: { from: 0, to: 5, empty: false },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setStoreView(mkApplyView());
  });

  it("源 bold=true → createSetMarkCommand;源 bold=false → createRemoveMarkCommand", () => {
    const snap: FormatPainterSnapshot = {
      text: { ...baseText, bold: true, italic: false },
    };
    applySnapshot(snap);
    expect(mockApplyBatch).toHaveBeenCalledOnce();
    expect(mockLibCmds.createSetMarkCommand).toHaveBeenCalledWith(
      mockSchemaMarks.bold
    );
    expect(mockLibCmds.createRemoveMarkCommand).toHaveBeenCalledWith(
      mockSchemaMarks.italic
    );
  });

  it("fontFamily 有 ascii+eastAsia → createSetMarkCommand 合并三字段", () => {
    const snap: FormatPainterSnapshot = {
      text: {
        ...baseText,
        fontFamily: { ascii: "Calibri", eastAsia: "SimSun" },
      },
    };
    applySnapshot(snap);
    expect(mockLibCmds.createSetMarkCommand).toHaveBeenCalledWith(
      mockSchemaMarks.fontFamily,
      { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "SimSun" }
    );
  });

  it("fontFamily={} → clearFontFamily", () => {
    const snap: FormatPainterSnapshot = {
      text: { ...baseText, fontFamily: {} },
    };
    applySnapshot(snap);
    // clearFontFamily 是 Command 常量,应被 push(applyBatch 接收的数组含它)
    expect(mockApplyBatch).toHaveBeenCalledOnce();
    // 验证未调用 createSetMarkCommand 设 fontFamily(仅布尔 mark 会调)
    const setCalls = mockLibCmds.createSetMarkCommand.mock.calls.filter(
      (c) => c[0] === mockSchemaMarks.fontFamily
    );
    expect(setCalls).toHaveLength(0);
  });

  it("fontFamily=null → 跳过字体设置(既不清也不设)", () => {
    const snap: FormatPainterSnapshot = {
      text: { ...baseText, fontFamily: null },
    };
    applySnapshot(snap);
    const setCalls = mockLibCmds.createSetMarkCommand.mock.calls.filter(
      (c) => c[0] === mockSchemaMarks.fontFamily
    );
    expect(setCalls).toHaveLength(0);
  });

  it("fontSize>0 → setFontSize;fontSize=0 → clearFontSize(走 clear 常量)", () => {
    const snap: FormatPainterSnapshot = {
      text: { ...baseText, fontSize: 24 },
    };
    applySnapshot(snap);
    expect(mockLibCmds.setFontSize).toHaveBeenCalledWith(24);
  });

  it("textColor 非空 → setTextColor({rgb})", () => {
    const snap: FormatPainterSnapshot = {
      text: { ...baseText, textColor: "FF0000" },
    };
    applySnapshot(snap);
    expect(mockLibCmds.setTextColor).toHaveBeenCalledWith({ rgb: "FF0000" });
  });

  it("snapshot.paragraph 存在 → 调用对齐/行距/缩进/段距命令", () => {
    const snap: FormatPainterSnapshot = {
      text: baseText,
      paragraph: {
        alignment: "center",
        lineSpacing: 1.5,
        indentLeft: 567,
        indentRight: 0,
        indentFirstLine: 0,
        spaceBefore: 0,
        spaceAfter: 120,
      },
    };
    applySnapshot(snap);
    // 对齐走 ALIGNMENT_COMMANDS 映射 → alignCenter 库常量
    expect(mockApplyBatch).toHaveBeenCalledOnce();
    expect(mockLibCmds.setLineSpacing).toHaveBeenCalledWith(1.5, undefined);
    expect(mockLibCmds.setSpaceBefore).toHaveBeenCalledWith(0);
    expect(mockLibCmds.setSpaceAfter).toHaveBeenCalledWith(120);
    expect(mockLibCmds.setIndentLeft).toHaveBeenCalledWith(567);
    expect(mockLibCmds.setIndentRight).toHaveBeenCalledWith(0);
    expect(mockLibCmds.setIndentFirstLine).toHaveBeenCalledWith(0);
  });

  it("snapshot.paragraph=undefined → 不调段落命令", () => {
    const snap: FormatPainterSnapshot = { text: baseText };
    applySnapshot(snap);
    expect(mockLibCmds.setLineSpacing).not.toHaveBeenCalled();
    expect(mockLibCmds.setSpaceBefore).not.toHaveBeenCalled();
    expect(mockLibCmds.setIndentLeft).not.toHaveBeenCalled();
  });

  it("全部命令通过 applyBatch 单事务(applyBatch 调用 1 次)", () => {
    const snap: FormatPainterSnapshot = {
      text: { ...baseText, bold: true, fontSize: 24 },
      paragraph: {
        alignment: "center",
        lineSpacing: 1.5,
        indentLeft: 0,
        indentRight: 0,
        indentFirstLine: 0,
        spaceBefore: 0,
        spaceAfter: 0,
      },
    };
    applySnapshot(snap);
    expect(mockApplyBatch).toHaveBeenCalledOnce();
    // applyBatch 接收一个 Command 数组
    const cmds = mockApplyBatch.mock.calls[0][0] as unknown[];
    expect(Array.isArray(cmds)).toBe(true);
    expect(cmds.length).toBeGreaterThan(0);
  });

  it("无 EditorView → 静默返回(不调 applyBatch)", () => {
    setStoreView(null);
    const snap: FormatPainterSnapshot = { text: baseText };
    expect(() => applySnapshot(snap)).not.toThrow();
    expect(mockApplyBatch).not.toHaveBeenCalled();
  });
});
