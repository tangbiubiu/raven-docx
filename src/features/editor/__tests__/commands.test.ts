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
    // Phase 5: 修订命令 / review commands
    acceptChange: vi.fn((_from: number, _to: number) => mkCmd()),
    rejectChange: vi.fn((_from: number, _to: number) => mkCmd()),
    acceptAllChanges: vi.fn(() => mkCmd()),
    rejectAllChanges: vi.fn(() => mkCmd()),
    findNextChange: vi.fn(
      () => ({ from: 15, to: 18, type: "insertion" }) as unknown
    ),
    findPreviousChange: vi.fn(
      () => ({ from: 2, to: 4, type: "deletion" }) as unknown
    ),
  };
});
vi.mock("@eigenpal/docx-editor-core/prosemirror/commands", () => mockCmds);

// --- mock docx-editor-core PM 插件(suggestion mode = track changes)---
const mockPlugins = vi.hoisted(() => ({
  toggleSuggestionMode: vi.fn(() => true),
  isSuggestionModeActive: vi.fn(() => false),
}));
vi.mock("@eigenpal/docx-editor-core/prosemirror/plugins", () => mockPlugins);

// --- mock prosemirror-state:替换 TextSelection.create,避免构造完整 PM doc ---
// vi.mock 工厂被提升到顶部,引用的变量必须用 vi.hoisted 声明。
const mockTextSelectionCreate = vi.hoisted(() =>
  vi.fn(() => ({ from: 0, to: 0 }))
);
vi.mock("prosemirror-state", () => ({
  TextSelection: { create: mockTextSelectionCreate },
}));

// --- mock store:提供可控的 getEditorView ---
const mockDispatch = vi.fn();
const mockTr = {
  setSelection: vi.fn(() => mockTr),
  scrollIntoView: vi.fn(() => mockTr),
};
const mockView = {
  state: {
    doc: {},
    selection: { from: 5, to: 10, head: 10 },
    tr: mockTr,
  },
  dispatch: mockDispatch,
};
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: {
    getState: () => ({ editorBridge: { getEditorView: () => mockView } }),
  },
}));

import {
  execAcceptAllChanges,
  execAcceptChange,
  execFindNextChange,
  execFindPreviousChange,
  execInsertTable,
  execRejectAllChanges,
  execRejectChange,
  execSetFontFamily,
  execSetFontSize,
  execSetHighlight,
  execSetTextColor,
  execToggleTrackChanges,
  isTrackChangesActive,
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

describe("commands — 审阅与打印 (Phase 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execToggleTrackChanges", () => {
    it("调用 toggleSuggestionMode 并传入 (state, dispatch)", () => {
      execToggleTrackChanges();
      expect(mockPlugins.toggleSuggestionMode).toHaveBeenCalledTimes(1);
      expect(mockPlugins.toggleSuggestionMode).toHaveBeenCalledWith(
        mockView.state,
        mockDispatch
      );
    });
  });

  describe("isTrackChangesActive", () => {
    it("调用 isSuggestionModeActive 查询当前状态", () => {
      mockPlugins.isSuggestionModeActive.mockReturnValueOnce(true);
      const result = isTrackChangesActive();
      expect(mockPlugins.isSuggestionModeActive).toHaveBeenCalledWith(
        mockView.state
      );
      expect(result).toBe(true);
    });
  });

  describe("execAcceptChange", () => {
    it("用当前选区 from/to 调用 acceptChange 并 dispatch", () => {
      execAcceptChange();
      expect(mockCmds.acceptChange).toHaveBeenCalledWith(5, 10);
      const cmd = mockCmds.acceptChange.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execRejectChange", () => {
    it("用当前选区 from/to 调用 rejectChange 并 dispatch", () => {
      execRejectChange();
      expect(mockCmds.rejectChange).toHaveBeenCalledWith(5, 10);
      const cmd = mockCmds.rejectChange.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execAcceptAllChanges", () => {
    it("调用 acceptAllChanges 并 dispatch", () => {
      execAcceptAllChanges();
      expect(mockCmds.acceptAllChanges).toHaveBeenCalledTimes(1);
      const cmd = mockCmds.acceptAllChanges.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execRejectAllChanges", () => {
    it("调用 rejectAllChanges 并 dispatch", () => {
      execRejectAllChanges();
      expect(mockCmds.rejectAllChanges).toHaveBeenCalledTimes(1);
      const cmd = mockCmds.rejectAllChanges.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execFindNextChange", () => {
    it("从选区 head 查找下一处修订并选中、滚动可视", () => {
      execFindNextChange();
      // 查询用选区 head 作为起点
      expect(mockCmds.findNextChange).toHaveBeenCalledWith(mockView.state, 10);
      // 选中找到的范围(15..18):TextSelection.create(doc, 15, 18)
      expect(mockTextSelectionCreate).toHaveBeenCalledWith(
        mockView.state.doc,
        15,
        18
      );
      expect(mockTr.setSelection).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe("execFindPreviousChange", () => {
    it("从选区 from 查找上一处修订并选中、滚动可视", () => {
      execFindPreviousChange();
      expect(mockCmds.findPreviousChange).toHaveBeenCalledWith(
        mockView.state,
        5
      );
      // 选中找到的范围(2..4)
      expect(mockTextSelectionCreate).toHaveBeenCalledWith(
        mockView.state.doc,
        2,
        4
      );
      expect(mockTr.setSelection).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
