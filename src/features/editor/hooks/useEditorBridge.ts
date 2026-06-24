// features/editor/hooks/useEditorBridge.ts — 编辑器桥接 Hook (Editor Bridge Hook)
// 封装 DocxEditorRef，将原生 API 桥接到 Zustand stores
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/docs/modules/stores.md §2

import type { SelectionState } from "@eigenpal/docx-editor-core/prosemirror";
import type { Document } from "@eigenpal/docx-editor-core/types/document";
import type { DocxEditorRef } from "@eigenpal/docx-editor-react";
import { useEffect, useRef } from "react";
import type { EditorBridge, FormatState } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { extractHeadings } from "../utils";

/** Heading styleId 正则（Heading1→1 ... Heading6→6）*/
const HEADING_STYLE_RE = /^Heading(\d)$/;

/** 已知内部对齐值查表（静态 → Record 而非 Set，遵循 ts-set-map 规则）*/
const KNOWN_ALIGNMENTS: Record<string, true> = {
  left: true,
  center: true,
  right: true,
  justify: true,
};

/** 将库 ParagraphAlignment 归一化为内部对齐值（'both' → 'justify'，未知值 → undefined）*/
function normalizeAlignment(
  a: string | undefined
): "left" | "center" | "right" | "justify" | undefined {
  if (a === "both") {
    return "justify";
  }
  if (a && KNOWN_ALIGNMENTS[a]) {
    return a as "left" | "center" | "right" | "justify";
  }
  return;
}

/**
 * 从库 SelectionState 构建 store.selectionFormat。
 * 提取为独立函数以降低 handleSelectionChange 的认知复杂度（Phase 7.1）。
 */
function buildSelectionFormat(
  state: SelectionState,
  listType: "ordered" | "unordered" | null
): FormatState {
  const tf = state.textFormatting;
  const vertAlign = tf.vertAlign;
  const headingMatch = state.styleId
    ? HEADING_STYLE_RE.exec(state.styleId)
    : null;
  return {
    bold: tf.bold ?? false,
    italic: tf.italic ?? false,
    underline: !!tf.underline,
    strike: tf.strike ?? false,
    superscript: vertAlign === "superscript",
    subscript: vertAlign === "subscript",
    textColor: tf.color?.rgb ?? "",
    highlight: tf.highlight && tf.highlight !== "none" ? tf.highlight : "",
    fontSize: tf.fontSize ? Math.round(tf.fontSize / 2) : 0,
    fontFamily: tf.fontFamily?.ascii ?? "",
    alignment: normalizeAlignment(state.paragraphFormatting.alignment),
    headingLevel: headingMatch ? Number(headingMatch[1]) : undefined,
    listType,
  };
}

/** 从 ProseMirror view 计算文档字数（CJK 逐字 + 拉丁按词） */
function computeCharCount(view: {
  state: {
    doc: {
      content: { size: number };
      textBetween: (from: number, to: number, sep: string) => string;
    };
  };
}): number {
  const text = view.state.doc.textBetween(0, view.state.doc.content.size, " ");
  const cjk = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z0-9]+/g) ?? []).length;
  return cjk + latin;
}

/** EditorBridge factory — 从 DocxEditorRef 创建桥接对象 */
export function createEditorBridge(ref: DocxEditorRef): EditorBridge {
  return {
    save: () => ref.save(),
    focus: () => ref.focus(),
    getAgent: () => ref.getAgent(),
    getDocument: () => ref.getDocument(),
    getLayout: () => ref.getEditorRef()?.getLayout() ?? null,
    getSelectionInfo: () => useDocumentStore.getState().selectionInfo,
    getEditorView: () => ref.getEditorRef()?.getView() ?? null,
    dispatchTransaction: (tr) => ref.getEditorRef()?.dispatch?.(tr),
    applyFormatting: () => false,
    setParagraphStyle: () => false,
    scrollToParaId: (paraId) => ref.scrollToParaId(paraId),
    setZoom: (zoom) => ref.setZoom(zoom / 100), // store 存百分比，DocxEditor 用分数刻度
    openPrintPreview: () => ref.openPrintPreview(),
    print: () => ref.print(),
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
  const setHeadings = useDocumentStore((s) => s.setHeadings);
  const setPageInfo = useDocumentStore((s) => s.setPageInfo);
  const setZoom = useDocumentStore((s) => s.setZoom);
  const setCharCount = useDocumentStore((s) => s.setCharCount);

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
      const z = editorRef.current.getZoom(); // DocxEditor 分数刻度（1.0 = 100%）
      setPageInfo(current, total);
      setZoom(Math.round(z * 100));

      // 轮询计算字数（解决打开文档时 onChange 不触发的问题）
      const view = editorRef.current.getEditorRef()?.getView();
      if (view) {
        setCharCount(computeCharCount(view));
      }
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

  /** 从 ProseMirror 当前选区提取段落 paraId */
  const getCurrentParaId = (): string | undefined => {
    const pmState = editorRef.current?.getEditorRef()?.getState();
    if (!pmState) {
      return;
    }
    const { $from } = pmState.selection;
    for (let d = $from.depth; d >= 0; d--) {
      const node = d === 0 ? $from.doc : $from.node(d);
      if (node.type.name === "paragraph" || node.type.name === "heading") {
        const attrs = node.attrs as { paraId?: string };
        return attrs?.paraId;
      }
    }
  };

  /** 从 ProseMirror 当前选区推断列表类型（向上遍历祖先节点）*/
  const getListTypeFromPM = (): "ordered" | "unordered" | null => {
    const pmState = editorRef.current?.getEditorRef()?.getState();
    if (!pmState) {
      return null;
    }
    const { $from } = pmState.selection;
    const depth = $from.depth;
    if (typeof depth !== "number") {
      return null;
    }
    for (let d = depth; d > 0; d--) {
      const node = $from.node(d);
      if (!node) {
        continue;
      }
      if (node.type.name === "ordered_list") {
        return "ordered";
      }
      if (node.type.name === "bullet_list") {
        return "unordered";
      }
    }
    return null;
  };

  /** 选区变化回调 — 将库 SelectionState 全量映射到 store.selectionFormat */
  const handleSelectionChange = (state: SelectionState | null) => {
    if (!state) {
      setSelection(null);
      setSelectionFormat(null);
      return;
    }
    setSelection({
      from: state.startParagraphIndex,
      to: state.endParagraphIndex,
      text: "",
      paraId: getCurrentParaId(),
    });
    setSelectionFormat(buildSelectionFormat(state, getListTypeFromPM()));
  };

  /** 文档内容变化回调 — 同步 dirty 标记 + 大纲标题 + 字数 */
  const handleChange = (_doc: Document) => {
    setDirty(true);
    setHeadings(extractHeadings(_doc));

    const view = editorRef.current?.getEditorRef()?.getView();
    if (view) {
      setCharCount(computeCharCount(view));
    }
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
