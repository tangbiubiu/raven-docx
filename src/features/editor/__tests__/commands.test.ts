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
});
