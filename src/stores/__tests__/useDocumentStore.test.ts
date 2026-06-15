// stores/__tests__/useDocumentStore.test.ts — 文档状态 Store 单元测试
// Reference: .dev/docs/modules/stores.md §2

import { beforeEach, describe, expect, it } from "vitest";
import {
  type EditorBridge,
  type SelectionInfo,
  useDocumentStore,
} from "../useDocumentStore";

/**
 * 创建最小 EditorBridge mock
 */
function createMockBridge(overrides?: Partial<EditorBridge>): EditorBridge {
  return {
    save: async () => null,
    focus: () => {
      /* no-op */
    },
    getAgent: () => null,
    getDocument: () => null,
    getLayout: () => null,
    getSelectionInfo: () => null,
    applyFormatting: () => false,
    setParagraphStyle: () => false,
    scrollToParaId: () => false,
    getEditorView: () => null,
    dispatchTransaction: () => {
      /* no-op */
    },
    setZoom: () => {
      /* no-op */
    },
    ...overrides,
  };
}

describe("useDocumentStore", () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useDocumentStore.getState().closeDocument();
    // 重置 zoom 到默认值
    useDocumentStore.getState().setZoom(100);
  });

  describe("初始状态", () => {
    it("文档初始为 null", () => {
      const state = useDocumentStore.getState();
      expect(state.document).toBeNull();
      expect(state.documentBuffer).toBeNull();
      expect(state.documentPath).toBeNull();
    });

    it("isDirty 初始为 false", () => {
      expect(useDocumentStore.getState().isDirty).toBe(false);
    });

    it("zoom 默认为 100", () => {
      expect(useDocumentStore.getState().zoom).toBe(100);
    });

    it("canUndo/canRedo 初始为 false", () => {
      const state = useDocumentStore.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it("editorBridge 初始为 null", () => {
      expect(useDocumentStore.getState().editorBridge).toBeNull();
    });
  });

  describe("setDocument", () => {
    it("设置文档后 isDirty 为 false", () => {
      const buffer = new ArrayBuffer(8);
      useDocumentStore
        .getState()
        .setDocument({ type: "document" }, buffer, "/test.docx");

      const state = useDocumentStore.getState();
      expect(state.document).toEqual({ type: "document" });
      expect(state.documentBuffer).toBe(buffer);
      expect(state.documentPath).toBe("/test.docx");
      expect(state.isDirty).toBe(false);
    });

    it("设置文档后重置 canUndo/canRedo", () => {
      // 先模拟有撤销状态
      useDocumentStore.getState().setCanUndoRedo(true, false);
      expect(useDocumentStore.getState().canUndo).toBe(true);

      // 设置新文档后应重置
      useDocumentStore
        .getState()
        .setDocument({ type: "document" }, new ArrayBuffer(0), null);
      expect(useDocumentStore.getState().canUndo).toBe(false);
      expect(useDocumentStore.getState().canRedo).toBe(false);
    });
  });

  describe("setDirty", () => {
    it("设置 isDirty 为 true", () => {
      useDocumentStore.getState().setDirty(true);
      expect(useDocumentStore.getState().isDirty).toBe(true);
    });

    it("设置 isDirty 为 false", () => {
      useDocumentStore.getState().setDirty(true);
      useDocumentStore.getState().setDirty(false);
      expect(useDocumentStore.getState().isDirty).toBe(false);
    });
  });

  describe("setPath", () => {
    it("更新文档路径", () => {
      useDocumentStore.getState().setPath("/new/path.docx");
      expect(useDocumentStore.getState().documentPath).toBe("/new/path.docx");
    });

    it("路径可设置为 null", () => {
      useDocumentStore.getState().setPath("/some/path.docx");
      useDocumentStore.getState().setPath(null);
      expect(useDocumentStore.getState().documentPath).toBeNull();
    });
  });

  describe("setEditorBridge", () => {
    it("设置 editorBridge", () => {
      const bridge = createMockBridge();
      useDocumentStore.getState().setEditorBridge(bridge);
      expect(useDocumentStore.getState().editorBridge).toBe(bridge);
    });

    it("可设为 null", () => {
      const bridge = createMockBridge();
      useDocumentStore.getState().setEditorBridge(bridge);
      useDocumentStore.getState().setEditorBridge(null);
      expect(useDocumentStore.getState().editorBridge).toBeNull();
    });
  });

  describe("setSelection / setSelectionFormat", () => {
    it("设置选区信息", () => {
      const sel: SelectionInfo = { from: 0, to: 5, text: "Hello" };
      useDocumentStore.getState().setSelection(sel);
      expect(useDocumentStore.getState().selectionInfo).toEqual(sel);
    });

    it("设置选区为 null", () => {
      useDocumentStore.getState().setSelection(null);
      expect(useDocumentStore.getState().selectionInfo).toBeNull();
    });

    it("设置选区格式", () => {
      const format = { bold: true, italic: false };
      useDocumentStore.getState().setSelectionFormat(format);
      expect(useDocumentStore.getState().selectionFormat).toEqual(format);
    });
  });

  describe("setZoom", () => {
    it("设置缩放比例", () => {
      useDocumentStore.getState().setZoom(150);
      expect(useDocumentStore.getState().zoom).toBe(150);
    });

    it("支持小数值缩放", () => {
      useDocumentStore.getState().setZoom(50);
      expect(useDocumentStore.getState().zoom).toBe(50);
    });
  });

  describe("setPageInfo", () => {
    it("设置页码信息", () => {
      useDocumentStore.getState().setPageInfo(3, 10);
      const state = useDocumentStore.getState();
      expect(state.currentPage).toBe(3);
      expect(state.totalPages).toBe(10);
    });
  });

  describe("setCanUndoRedo", () => {
    it("设置撤销重做状态", () => {
      useDocumentStore.getState().setCanUndoRedo(true, true);
      const state = useDocumentStore.getState();
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(true);
    });

    it("设置 only undo", () => {
      useDocumentStore.getState().setCanUndoRedo(true, false);
      expect(useDocumentStore.getState().canUndo).toBe(true);
      expect(useDocumentStore.getState().canRedo).toBe(false);
    });
  });

  describe("closeDocument", () => {
    it("清空所有文档状态", () => {
      // 先设置各种状态
      const store = useDocumentStore.getState();
      store.setDocument({ type: "doc" }, new ArrayBuffer(0), "/test.docx");
      store.setDirty(true);
      store.setEditorBridge(createMockBridge());
      store.setSelection({ from: 0, to: 3, text: "abc" });
      store.setSelectionFormat({ bold: true });
      store.setZoom(150);
      store.setPageInfo(5, 20);
      store.setCanUndoRedo(true, true);

      // 关闭文档
      store.closeDocument();

      const state = useDocumentStore.getState();
      expect(state.document).toBeNull();
      expect(state.documentBuffer).toBeNull();
      expect(state.documentPath).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.editorBridge).toBeNull();
      expect(state.selectionInfo).toBeNull();
      expect(state.selectionFormat).toBeNull();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.totalPages).toBe(1);
      expect(state.currentPage).toBe(1);
      // zoom 不应被 closeDocument 重置
      expect(state.zoom).toBe(150);
    });
  });
});
