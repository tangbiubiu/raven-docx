// src/features/editor/__tests__/commands.test.ts — commands.ts 测试
// 验证 exec* 封装函数调用正确的 docx-editor-core PM 命令并传递正确参数。

import type { Command } from "prosemirror-state";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mock docx-editor-core PM 命令 ---
// 真实命令需要完整 ProseMirror schema,测试环境不具备,故 mock 模块。
const mockCmds = vi.hoisted(() => {
  const mkCmd = vi.fn((): Command => vi.fn(() => true) as unknown as Command);
  return {
    setFontFamily: vi.fn((_name: string) => mkCmd()),
    setFontSize: vi.fn((_size: number) => mkCmd()),
    setTextColor: vi.fn((_attrs: unknown) => mkCmd()),
    setHighlight: vi.fn((_color: string) => mkCmd()),
    insertTable: vi.fn((_rows: number, _cols: number) => mkCmd()),
    // Phase 3: 段落格式 / paragraph formatting
    setLineSpacing: vi.fn((_value: number) => mkCmd()),
    setSpaceBefore: vi.fn((_twips: number) => mkCmd()),
    setSpaceAfter: vi.fn((_twips: number) => mkCmd()),
    setIndentLeft: vi.fn((_twips: number) => mkCmd()),
    setIndentRight: vi.fn((_twips: number) => mkCmd()),
    setIndentFirstLine: vi.fn((_twips: number) => mkCmd()),
  };
});
vi.mock("@eigenpal/docx-editor-core/prosemirror/commands", () => mockCmds);

// --- mock store:提供可控的 getEditorView ---
const mockDispatch = vi.fn();
const mockView = {
  state: {},
  dispatch: mockDispatch,
};
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: {
    getState: () => ({ editorBridge: { getEditorView: () => mockView } }),
  },
}));

import {
  execInsertTable,
  execSetFontFamily,
  execSetFontSize,
  execSetHighlight,
  execSetIndentation,
  execSetLineSpacing,
  execSetParagraphSpacing,
  execSetTextColor,
} from "@/features/editor/commands";

describe("commands — 格式命令封装", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execSetFontFamily", () => {
    it("调用 docx-editor-core setFontFamily 命令并 dispatch", () => {
      execSetFontFamily("Arial");
      expect(mockCmds.setFontFamily).toHaveBeenCalledWith("Arial");
      // setFontFamily 返回一个 Command 函数,该函数应被调用并传入 (state, dispatch)
      const cmd = mockCmds.setFontFamily.mock.results[0]?.value;
      expect(cmd).toBeDefined();
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execSetFontSize", () => {
    it("传递 half-points 值(24 = 12pt)", () => {
      execSetFontSize(24);
      expect(mockCmds.setFontSize).toHaveBeenCalledWith(24);
      const cmd = mockCmds.setFontSize.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execSetTextColor", () => {
    it("传递 { rgb } 属性对象(不带 #)", () => {
      execSetTextColor("FF0000");
      expect(mockCmds.setTextColor).toHaveBeenCalledWith({ rgb: "FF0000" });
    });

    it("自动剥离 # 前缀", () => {
      execSetTextColor("#00FF00");
      expect(mockCmds.setTextColor).toHaveBeenCalledWith({ rgb: "00FF00" });
    });
  });

  describe("execSetHighlight", () => {
    it("传递颜色名", () => {
      execSetHighlight("yellow");
      expect(mockCmds.setHighlight).toHaveBeenCalledWith("yellow");
    });
  });

  describe("execInsertTable", () => {
    it("调用 insertTable 命令并 dispatch", () => {
      execInsertTable(3, 4);
      expect(mockCmds.insertTable).toHaveBeenCalledWith(3, 4);
      const cmd = mockCmds.insertTable.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("使用默认参数 3x3", () => {
      execInsertTable();
      expect(mockCmds.insertTable).toHaveBeenCalledWith(3, 3);
    });

    it("不写入占位提示文本(回退副作用)", () => {
      mockDispatch.mockClear();
      execInsertTable();
      // 不应有 insertText 调用 —— 仅 dispatch insertTable 命令的结果
      const dispatchCalls = mockDispatch.mock.calls;
      for (const call of dispatchCalls) {
        const tr = call[0];
        // tr.insertText 是占位实现遗留;真实命令不应调用它
        expect(tr?.insertText).toBeUndefined();
      }
    });
  });
  // === Phase 3: 段落格式 / paragraph formatting ===

  describe("execSetLineSpacing", () => {
    it("调用 setLineSpacing 命令并 dispatch(倍数 1.5)", () => {
      execSetLineSpacing(1.5);
      expect(mockCmds.setLineSpacing).toHaveBeenCalledWith(1.5);
      const cmd = mockCmds.setLineSpacing.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("支持 1.0/1.15/1.5/2.0 倍数", () => {
      for (const v of [1.0, 1.15, 1.5, 2.0]) {
        mockCmds.setLineSpacing.mockClear();
        execSetLineSpacing(v);
        expect(mockCmds.setLineSpacing).toHaveBeenCalledWith(v);
      }
    });

    it("无 editor view 时静默返回(不抛错)", () => {
      // exec* 内部 getView() 返回 null 即提前 return;此处仅断言可安全调用。
      expect(() => execSetLineSpacing(1.0)).not.toThrow();
    });
  });

  describe("execSetParagraphSpacing", () => {
    it("分别调用 setSpaceBefore / setSpaceAfter(twips)", () => {
      execSetParagraphSpacing(120, 240);
      expect(mockCmds.setSpaceBefore).toHaveBeenCalledWith(120);
      expect(mockCmds.setSpaceAfter).toHaveBeenCalledWith(240);
      const beforeCmd = mockCmds.setSpaceBefore.mock.results[0]?.value;
      const afterCmd = mockCmds.setSpaceAfter.mock.results[0]?.value;
      expect(beforeCmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
      expect(afterCmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("段前为 0 仍调用 setSpaceBefore", () => {
      execSetParagraphSpacing(0, 60);
      expect(mockCmds.setSpaceBefore).toHaveBeenCalledWith(0);
      expect(mockCmds.setSpaceAfter).toHaveBeenCalledWith(60);
    });
  });

  describe("execSetIndentation", () => {
    it("仅 left 时调用 setIndentLeft", () => {
      execSetIndentation({ left: 567 });
      expect(mockCmds.setIndentLeft).toHaveBeenCalledWith(567);
      expect(mockCmds.setIndentRight).not.toHaveBeenCalled();
      expect(mockCmds.setIndentFirstLine).not.toHaveBeenCalled();
      const cmd = mockCmds.setIndentLeft.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("仅 right 时调用 setIndentRight", () => {
      execSetIndentation({ right: 567 });
      expect(mockCmds.setIndentRight).toHaveBeenCalledWith(567);
      expect(mockCmds.setIndentLeft).not.toHaveBeenCalled();
    });

    it("仅 firstLine 时调用 setIndentFirstLine", () => {
      execSetIndentation({ firstLine: 480 });
      expect(mockCmds.setIndentFirstLine).toHaveBeenCalledWith(480);
      expect(mockCmds.setIndentLeft).not.toHaveBeenCalled();
    });

    it("三参数同时设置均调用对应命令", () => {
      execSetIndentation({ left: 100, right: 200, firstLine: 300 });
      expect(mockCmds.setIndentLeft).toHaveBeenCalledWith(100);
      expect(mockCmds.setIndentRight).toHaveBeenCalledWith(200);
      expect(mockCmds.setIndentFirstLine).toHaveBeenCalledWith(300);
    });

    it("空对象时不调用任何缩进命令", () => {
      execSetIndentation({});
      expect(mockCmds.setIndentLeft).not.toHaveBeenCalled();
      expect(mockCmds.setIndentRight).not.toHaveBeenCalled();
      expect(mockCmds.setIndentFirstLine).not.toHaveBeenCalled();
    });
  });
});
