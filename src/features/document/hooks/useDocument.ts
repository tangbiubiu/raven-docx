// features/document/hooks/useDocument.ts — 文档操作 Hook (Document Operations Hook)
// 封装新建/打开/保存/另存为/关闭等文档生命周期操作
// Reference: .dev/plan/implementation-plan.md §Phase 2.3

import { commands } from "@/lib/bindings";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { addRecentFile } from "./useRecentFiles";
/** Tauri 环境检测 */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * 打开文件对话框（Tauri dialog 插件）。
 * 未安装插件或非 Tauri 环境时返回 null。
 */
async function openFileDialog(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: false,
      filters: [{ name: "Word 文档", extensions: ["docx"] }],
    });
    return selected ?? null;
  } catch {
    return null;
  }
}

/**
 * 保存文件对话框（Tauri dialog 插件）。
 * 未安装插件或非 Tauri 环境时返回 null。
 */
async function saveFileDialog(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const selected = await save({
      filters: [{ name: "Word 文档", extensions: ["docx"] }],
    });
    return selected ?? null;
  } catch {
    return null;
  }
}

/**
 * 读取 .docx 文件为 ArrayBuffer（Rust 命令 openDocx）。
 * 非 Tauri 环境返回 null。
 */
async function readFileAsBuffer(path: string): Promise<ArrayBuffer | null> {
  if (!isTauri()) return null;
  try {
    const result = await commands.openDocx(path);
    if (result.status === "ok") {
      return new Uint8Array(result.data).buffer;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 写入 ArrayBuffer 到文件（Rust 命令 saveDocx）。
 * 用 Rust 命令而非 fs 插件，绕过前端 scope 沙箱限制。
 * 非 Tauri 环境返回 false。
 */
async function writeFileFromBuffer(
  path: string,
  buffer: ArrayBuffer
): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const result = await commands.saveDocx(
      path,
      Array.from(new Uint8Array(buffer))
    );
    return result.status === "ok";
  } catch {
    return false;
  }
}

/**
 * useDocument — 文档生命周期操作 Hook。
 *
 * 提供 newDocument / openDocument / saveDocument / saveDocumentAs / closeDocument。
 * 所有操作通过 useDocumentStore 读写状态。
 */
export function useDocument() {
  const store = useDocumentStore;

  /** 新建文档 — 进入空白编辑模式 */
  function newDocument() {
    store.getState().createNewDocument();
  }

  /** 打开文档 — 弹出文件对话框，读取 .docx 字节并设置到 store */
  async function openDocument(): Promise<boolean> {
    const filePath = await openFileDialog();
    if (!filePath) return false;

    const buffer = await readFileAsBuffer(filePath);
    if (!buffer) return false;

    // setDocument: doc=null（由 EditorPane 解析 buffer）、buffer、path
    store.getState().setDocument(null, buffer, filePath);
    addRecentFile(filePath);
    return true;
  }

  /**
   * 保存文档 — 通过 editorBridge.save() 获取最新 buffer，写回原路径。
   * 若 documentPath 为 null（新建文档未保存过），自动转为 saveDocumentAs。
   */
  async function saveDocument(): Promise<boolean> {
    const { editorBridge, documentPath } = store.getState();
    if (!editorBridge) return false;

    const buffer = await editorBridge.save();
    if (!buffer) return false;

    if (!documentPath) {
      return saveDocumentAs();
    }

    const ok = await writeFileFromBuffer(documentPath, buffer);
    if (ok) {
      store.getState().setDirty(false);
    }
    return ok;
  }

  /** 另存为 — 弹出保存对话框，写入文件 */
  async function saveDocumentAs(): Promise<boolean> {
    const { editorBridge } = store.getState();
    if (!editorBridge) return false;

    const buffer = await editorBridge.save();
    if (!buffer) return false;

    const filePath = await saveFileDialog();
    if (!filePath) return false;

    const ok = await writeFileFromBuffer(filePath, buffer);
    if (ok) {
      store.getState().setPath(filePath);
      store.getState().setDirty(false);
      addRecentFile(filePath);
    }
    return ok;
  }

  /**
   * 关闭文档 — 如果有未保存更改，返回 false 让调用方处理确认逻辑。
   * 未修改时直接关闭。
   */
  function closeDocument(): boolean {
    const { isDirty } = store.getState();
    if (isDirty) {
      return false;
    }
    store.getState().closeDocument();
    return true;
  }

  /** 强制关闭（确认放弃更改后调用） */
  function forceCloseDocument() {
    store.getState().closeDocument();
  }

  return {
    newDocument,
    openDocument,
    saveDocument,
    saveDocumentAs,
    closeDocument,
    forceCloseDocument,
  };
}
