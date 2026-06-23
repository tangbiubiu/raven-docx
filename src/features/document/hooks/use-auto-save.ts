import { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentStore } from "@/stores/useDocumentStore";

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds
const DRAFT_KEY = "raven:draft";

type DraftData = {
  buffer: string;
  timestamp: number;
  path: string;
};

type AutoSaveState = {
  isSaving: boolean;
  lastSaveTime: number | null;
};

type RecoverFns = {
  setDocument: (doc: null, buffer: ArrayBuffer, path: string) => void;
  setPath: (path: string) => void;
  setDirty: (dirty: boolean) => void;
};

/** 从磁盘原文件恢复文档，失败回退到草稿 buffer。 */
async function recoverDocument(fns: RecoverFns): Promise<void> {
  const draftJson = localStorage.getItem(DRAFT_KEY);
  if (!draftJson) return;

  const draft: DraftData = JSON.parse(draftJson);
  if (!draft.path) return;

  const draftBuffer = Uint8Array.from(atob(draft.buffer), (c) =>
    c.charCodeAt(0)
  ).buffer;

  try {
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const data = await readFile(draft.path);
    fns.setDocument(null, data.buffer as ArrayBuffer, draft.path);
    fns.setPath(draft.path);
    fns.setDirty(false);
  } catch {
    // 磁盘文件不存在/不可读 → 回退到草稿 buffer（崩溃恢复）
    fns.setDocument(null, draftBuffer as ArrayBuffer, draft.path);
    fns.setPath(draft.path);
    fns.setDirty(true);
  }
}

/**
 * Hook for managing automatic document saving
 * Implements periodic auto-save and draft recovery
 */
export function useAutoSave(): AutoSaveState {
  const documentBuffer = useDocumentStore((state) => state.documentBuffer);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const documentPath = useDocumentStore((state) => state.documentPath);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setPath = useDocumentStore((state) => state.setPath);
  const setDirty = useDocumentStore((state) => state.setDirty);
  const setAutoSaving = useDocumentStore((state) => state.setAutoSaving);

  // Auto-save enabled by default; toggle could be added to Settings later
  const autoSaveEnabled = true;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 启动恢复：优先从磁盘读原文件，失败才回退到草稿 buffer。
  useEffect(() => {
    let cancelled = false;

    recoverDocument({
      setDocument: (doc, buffer, path) => {
        if (!cancelled) setDocument(doc, buffer, path);
      },
      setPath: (path) => {
        if (!cancelled) setPath(path);
      },
      setDirty: (dirty) => {
        if (!cancelled) setDirty(dirty);
      },
    }).catch(() => {
      // 草稿解析失败，忽略
    });

    return () => {
      cancelled = true;
    };
  }, [setDocument, setPath, setDirty]);

  // Auto-save implementation — 将当前 buffer 存为 localStorage 草稿（用于崩溃恢复）
  // 注意：草稿保存 ≠ 文件保存，不清除 isDirty（原文件仍与内容不一致）
  const saveDocument = useCallback(() => {
    if (documentBuffer === null || documentPath === null || isDirty === false) {
      return;
    }
    setIsSaving(true);
    setAutoSaving(true);
    try {
      const uint8Array = new Uint8Array(documentBuffer);
      const base64Buffer = btoa(String.fromCharCode(...uint8Array));

      const draft: DraftData = {
        buffer: base64Buffer,
        timestamp: Date.now(),
        path: documentPath,
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSaveTime(Date.now());
    } catch (error) {
      console.error("Failed to auto-save:", error);
    } finally {
      setIsSaving(false);
      setAutoSaving(false);
    }
  }, [documentBuffer, documentPath, isDirty, setAutoSaving]);

  // Set up periodic auto-save
  useEffect(() => {
    if (!autoSaveEnabled) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }

    const scheduleNextSave = () => {
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument();
        scheduleNextSave();
      }, AUTO_SAVE_INTERVAL);
    };

    scheduleNextSave();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [autoSaveEnabled, saveDocument]);

  return {
    isSaving,
    lastSaveTime,
  };
}
