// features/editor/hooks/__tests__/useEditorBridge.test.ts — useEditorBridge Hook 测试

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useEditorBridge } from "../useEditorBridge";

describe("useEditorBridge", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
    useDocumentStore.getState().setZoom(100);
  });

  describe("初始状态", () => {
    it("返回 editorRef 初始为 null", () => {
      const { result } = renderHook(() => useEditorBridge());
      expect(result.current.editorRef.current).toBeNull();
    });
  });

  describe("handleSelectionChange", () => {
    it("有选区时更新 store.selectionInfo 和 selectionFormat", () => {
      const { result } = renderHook(() => useEditorBridge());

      act(() => {
        result.current.handleSelectionChange({
          hasSelection: true,
          isMultiParagraph: false,
          textFormatting: {
            bold: true,
            italic: false,
            underline: undefined,
            strike: false,
            fontSize: 24,
            fontFamily: { ascii: "Arial" },
          },
          paragraphFormatting: { alignment: "left", lineSpacing: 1.15 },
          styleId: "Heading1",
          startParagraphIndex: 0,
          endParagraphIndex: 2,
        });
      });

      const info = useDocumentStore.getState().selectionInfo;
      expect(info).not.toBeNull();
      expect(info?.from).toBe(0);
      expect(info?.to).toBe(2);
      expect(info?.paraId).toBe("Heading1");

      const fmt = useDocumentStore.getState().selectionFormat;
      expect(fmt).not.toBeNull();
      expect(fmt?.bold).toBe(true);
      expect(fmt?.italic).toBe(false);
      expect(fmt?.fontSize).toBe(12);
      expect(fmt?.fontFamily).toBe("Arial");
      expect(fmt?.strike).toBe(false);
    });

    it("无选区时清空 selectionInfo 和 selectionFormat", () => {
      const { result } = renderHook(() => useEditorBridge());

      act(() => {
        result.current.handleSelectionChange({
          hasSelection: true,
          isMultiParagraph: false,
          textFormatting: { bold: false },
          paragraphFormatting: { alignment: "left" },
          styleId: null,
          startParagraphIndex: 0,
          endParagraphIndex: 0,
        });
      });
      expect(useDocumentStore.getState().selectionInfo).not.toBeNull();

      act(() => {
        result.current.handleSelectionChange(null);
      });
      expect(useDocumentStore.getState().selectionInfo).toBeNull();
      expect(useDocumentStore.getState().selectionFormat).toBeNull();
    });
  });

  describe("handleChange", () => {
    it("文档变更时标记 isDirty=true", () => {
      const { result } = renderHook(() => useEditorBridge());
      act(() => {
        result.current.handleChange({} as never);
      });
      expect(useDocumentStore.getState().isDirty).toBe(true);
    });
  });

  describe("ref 注入", () => {
    function createMockRef() {
      return {
        getAgent: vi.fn(() => null),
        getDocument: vi.fn(() => null),
        getEditorRef: vi.fn(() => null),
        save: vi.fn(async () => new ArrayBuffer(8)),
        setZoom: vi.fn(),
        getZoom: vi.fn(() => 100),
        focus: vi.fn(),
        getCurrentPage: vi.fn(() => 1),
        getTotalPages: vi.fn(() => 1),
        scrollToPage: vi.fn(),
        scrollToParaId: vi.fn(() => false),
        undo: vi.fn(() => false),
        redo: vi.fn(() => false),
        canUndo: vi.fn(() => false),
        canRedo: vi.fn(() => false),
        print: vi.fn(),
        loadDocument: vi.fn(),
        loadDocumentBuffer: vi.fn(async () => {
          // no-op
        }),
      };
    }

    it("editorRef 就绪后 bridge 被注入 store", () => {
      const { result } = renderHook(() => useEditorBridge());
      const mockRef = createMockRef();
      act(() => {
        // @ts-expect-error 测试用 mock ref
        result.current.editorRef.current = mockRef;
        result.current.injectBridge();
      });
      const bridge = useDocumentStore.getState().editorBridge;
      expect(bridge).not.toBeNull();
      expect(bridge?.focus).toBeInstanceOf(Function);
      expect(bridge?.save).toBeInstanceOf(Function);
    });

    it("bridge.focus() 调用 ref.current.focus()", () => {
      const { result } = renderHook(() => useEditorBridge());
      const mockRef = createMockRef();
      act(() => {
        // @ts-expect-error 测试用 mock ref
        result.current.editorRef.current = mockRef;
        result.current.injectBridge();
      });
      useDocumentStore.getState().editorBridge?.focus();
      expect(mockRef.focus).toHaveBeenCalled();
    });
  });

  describe("页面轮询", () => {
    it("以 500ms 间隔启动 setInterval", () => {
      const spy = vi.spyOn(window, "setInterval");
      const { result } = renderHook(() => useEditorBridge());
      act(() => {
        result.current.startPagePolling();
      });
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 500);
      spy.mockRestore();
    });
  });
});
