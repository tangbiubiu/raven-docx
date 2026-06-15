// useDocumentStore — 文档状态 (Document State)
// 管理文档数据、编辑器桥接、选区、布局、撤销重做等状态
// Reference: .dev/docs/modules/stores.md §2

import { create } from "zustand";

/**
 * 编辑器桥接接口 — 暴露给其他 feature 的编辑器操作能力。
 * 实际类型由 @eigenpal/docx-editor-core 提供，此处定义最小契约。
 */
export type EditorBridge = {
  save(): Promise<ArrayBuffer | null>;
  focus(): void;
  getAgent(): unknown;
  getDocument(): unknown;
  getLayout(): unknown;
  getSelectionInfo(): SelectionInfo | null;
  applyFormatting(opts: Record<string, unknown>): boolean;
  setParagraphStyle(opts: { paraId: string; styleId: string }): boolean;
  scrollToParaId(paraId: string): boolean;
};

/** 选区信息 */
export type SelectionInfo = {
  from: number;
  to: number;
  text: string;
  paraId?: string;
};

/** 文档状态 */
export type DocumentState = {
  // --- 文档数据 ---
  document: unknown | null; // @eigenpal/docx-editor-core Document 对象
  documentBuffer: ArrayBuffer | null; // 原始 OOXML 字节（用于保存）
  documentPath: string | null; // 本地文件路径
  isDirty: boolean; // 是否有未保存修改
  isNewDocument: boolean; // 是否处于新建空白文档模式

  // --- 编辑器桥接 ---
  editorBridge: EditorBridge | null;

  // --- 选区 ---
  selectionInfo: SelectionInfo | null;
  selectionFormat: FormatState | null; // 当前选区格式（用于 Toolbar 状态同步）

  // --- 布局 ---
  zoom: number; // 百分比，默认 100
  totalPages: number;
  currentPage: number;

  // --- 撤销重做 ---
  canUndo: boolean;
  canRedo: boolean;

  // --- Actions ---
  setDocument(doc: unknown, buffer: ArrayBuffer, path: string | null): void;
  setDirty(dirty: boolean): void;
  setPath(path: string | null): void;
  setEditorBridge(bridge: EditorBridge | null): void;
  setSelection(info: SelectionInfo | null): void;
  setSelectionFormat(format: FormatState | null): void;
  setZoom(zoom: number): void;
  setPageInfo(current: number, total: number): void;
  setCanUndoRedo(canUndo: boolean, canRedo: boolean): void;
  closeDocument(): void; // 清空所有文档状态
  createNewDocument(): void; // 进入新建空白文档模式
};

/** 格式状态 — 同步 Toolbar 按钮 active 状态 */
export type FormatState = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  highlight?: string;
  alignment?: "left" | "center" | "right" | "justify";
  headingLevel?: number; // 1-6，undefined 表示正文
  listType?: "ordered" | "unordered" | null;
  superscript?: boolean;
  subscript?: boolean;
};

const initialDocumentState = {
  document: null,
  documentBuffer: null,
  documentPath: null,
  isDirty: false,
  isNewDocument: false,
  editorBridge: null,
  selectionInfo: null,
  selectionFormat: null,
  zoom: 100,
  totalPages: 1,
  currentPage: 1,
  canUndo: false,
  canRedo: false,
} as const satisfies Partial<DocumentState>;

export const useDocumentStore = create<DocumentState>((set) => ({
  ...initialDocumentState,

  setDocument(doc, buffer, path) {
    set({
      document: doc,
      documentBuffer: buffer,
      documentPath: path,
      isNewDocument: false,
      isDirty: false,
      canUndo: false,
      canRedo: false,
    });
  },

  setDirty(dirty) {
    set({ isDirty: dirty });
  },

  setPath(path) {
    set({ documentPath: path });
  },

  setEditorBridge(bridge) {
    set({ editorBridge: bridge });
  },

  setSelection(info) {
    set({ selectionInfo: info });
  },

  setSelectionFormat(format) {
    set({ selectionFormat: format });
  },

  setZoom(zoom) {
    set({ zoom });
  },

  setPageInfo(current, total) {
    set({ currentPage: current, totalPages: total });
  },

  setCanUndoRedo(canUndo, canRedo) {
    set({ canUndo, canRedo });
  },

  closeDocument() {
    set({
      document: null,
      documentBuffer: null,
      documentPath: null,
      isNewDocument: false,
      isDirty: false,
      editorBridge: null,
      selectionInfo: null,
      selectionFormat: null,
      canUndo: false,
      canRedo: false,
      totalPages: 1,
      currentPage: 1,
    });
  },

  createNewDocument() {
    set({
      document: null,
      documentBuffer: null,
      documentPath: null,
      isNewDocument: true,
      isDirty: false,
      editorBridge: null,
      selectionInfo: null,
      selectionFormat: null,
      canUndo: false,
      canRedo: false,
      totalPages: 1,
      currentPage: 1,
    });
  },
}));
