// features/editor/hooks/useEditorBridge.ts — 编辑器桥接 Hook (Editor Bridge Hook)
// 封装 DocxEditorRef，将原生 API 桥接到 Zustand stores
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/docs/modules/stores.md §2

import type { SelectionState } from "@eigenpal/docx-editor-core/prosemirror";
import type { Document } from "@eigenpal/docx-editor-core/types/document";
import type { DocxEditorRef } from "@eigenpal/docx-editor-react";
import { useEffect, useRef } from "react";
import type { EditorBridge, SelectionInfo } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** EditorBridge factory — 从 DocxEditorRef 创建桥接对象 */
export function createEditorBridge(ref: DocxEditorRef): EditorBridge {
  return {
    save: () => ref.save(),
    focus: () => ref.focus(),
    getAgent: () => ref.getAgent(),
    getDocument: () => ref.getDocument(),
    getSelectionInfo: () => useDocumentStore.getState().selectionInfo,
    applyFormatting: () => false,
    setParagraphStyle: () => false,
    scrollToParaId: (paraId) => ref.scrollToParaId(paraId),
  };
}

/**
 * useEditorBridge — 编辑器桥接 Hook。
 *
 * 封装 `useRef<DocxEditorRef>` 并将编辑器 API 注入 `useDocumentStore`。
 * 同时处理选区变化、文档变更、页面轮询。
 */
export function useEditorBridge() {
  const editorRef = useRef<DocxEditorRef>(null);
  const injectedRef = useRef(false);

  const setEditorBridge = useDocumentStore((s) => s.setEditorBridge);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const setSelectionFormat = useDocumentStore((s) => s.setSelectionFormat);
  const setDirty = useDocumentStore((s) => s.setDirty);
  const setPageInfo = useDocumentStore((s) => s.setPageInfo);
  const setZoom = useDocumentStore((s) => s.setZoom);

  /** 将 EditorBridge 注入 store（只执行一次） */
  const injectBridge = () => {
    if (editorRef.current && !injectedRef.current) {
      injectedRef.current = true;
      setEditorBridge(createEditorBridge(editorRef.current));
    }
  };

  /** 启动页码轮询（每 500ms） */
  const startPagePolling = () => {
    const existing = window.__editorPagePollingId;
    if (existing) {
      clearInterval(existing);
    }

    const id = window.setInterval(() => {
      if (!editorRef.current) {
        return;
      }
      const current = editorRef.current.getCurrentPage();
      const total = editorRef.current.getTotalPages();
      const z = editorRef.current.getZoom();
      setPageInfo(current, total);
      setZoom(z);
    }, 500);

    window.__editorPagePollingId = id;
  };

  /** 停止页面轮询 */
  const stopPagePolling = () => {
    if (window.__editorPagePollingId) {
      clearInterval(window.__editorPagePollingId);
      window.__editorPagePollingId = undefined;
    }
  };

  // ref 就绪时注入 bridge 并启动轮询（仅 mount 时执行一次）
  // biome-ignore lint/correctness/useExhaustiveDependencies: injectBridge/startPagePolling/stopPagePolling are stable
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      injectBridge();
      startPagePolling();
    });
    return () => {
      cancelAnimationFrame(id);
      stopPagePolling();
    };
  }, []);

  /** 选区变化回调 */
  const handleSelectionChange = (state: SelectionState | null) => {
    if (state) {
      const info: SelectionInfo = {
        from: state.startParagraphIndex,
        to: state.endParagraphIndex,
        text: "",
        paraId: state.styleId ?? undefined,
      };

      setSelection(info);

      setSelectionFormat({
        bold: state.textFormatting.bold ?? false,
        italic: state.textFormatting.italic ?? false,
        underline: !!state.textFormatting.underline,
        strike: state.textFormatting.strike ?? false,
        fontSize: state.textFormatting.fontSize
          ? Math.round(state.textFormatting.fontSize / 2)
          : 0,
        fontFamily: state.textFormatting.fontFamily?.ascii ?? "",
      });
    } else {
      setSelection(null);
      setSelectionFormat(null);
    }
  };

  /** 文档内容变化回调 */
  const handleChange = (_doc: Document) => {
    setDirty(true);
  };

  /** 保存回调（Ctrl+S） */
  const handleSave = (_buffer: ArrayBuffer) => {
    setDirty(false);
  };

  return {
    editorRef,
    injectBridge,
    startPagePolling,
    handleSelectionChange,
    handleChange,
    handleSave,
  };
}

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: interface required for global augmentation
  interface Window {
    __editorPagePollingId?: number;
  }
}
