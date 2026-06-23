// features/document/hooks/__tests__/use-auto-save.test.ts
// 自动保存草稿 + 启动恢复测试

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
}));

vi.mock("@/lib/tauri-events", () => ({
  onPiEvent: () => Promise.resolve(vi.fn()),
  onCloseRequested: () => Promise.resolve(vi.fn()),
}));

import { readFile } from "@tauri-apps/plugin-fs";
import { useAutoSave } from "../use-auto-save";

const mockReadFile = vi.mocked(readFile);

const DRAFT_KEY = "raven:draft";

/** 构造草稿 JSON */
function makeDraft(path: string, bytes: number[]): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return JSON.stringify({ buffer: base64, timestamp: Date.now(), path });
}

describe("useAutoSave — 启动恢复", () => {
  beforeEach(() => {
    localStorage.clear();
    useDocumentStore.getState().closeDocument();
    mockReadFile.mockClear();
    mockReadFile.mockResolvedValue(new Uint8Array([0]));
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("有草稿 path 时从磁盘原文件恢复（不用草稿 buffer）", async () => {
    // 草稿 buffer = [1,2,3]，磁盘文件 buffer = [9,9,9]
    // 期望恢复用磁盘 buffer
    localStorage.setItem(DRAFT_KEY, makeDraft("/test/doc.docx", [1, 2, 3]));
    mockReadFile.mockResolvedValue(new Uint8Array([9, 9, 9]));

    renderHook(() => useAutoSave());
    // 等待异步恢复完成（动态 import + readFile + setState）
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReadFile).toHaveBeenCalledWith("/test/doc.docx");
    // 恢复的是磁盘内容
    const buf = useDocumentStore.getState().documentBuffer;
    expect(new Uint8Array(buf ?? new ArrayBuffer(0))).toEqual(
      new Uint8Array([9, 9, 9])
    );
    expect(useDocumentStore.getState().documentPath).toBe("/test/doc.docx");
    // 从磁盘恢复 → isDirty=false
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it("磁盘文件不存在时回退到草稿 buffer（崩溃恢复）", async () => {
    localStorage.setItem(DRAFT_KEY, makeDraft("/test/deleted.docx", [1, 2, 3]));
    // readFile 抛错（文件不存在）
    mockReadFile.mockRejectedValue(new Error("file not found"));

    renderHook(() => useAutoSave());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // 回退到草稿 buffer
    const buf = useDocumentStore.getState().documentBuffer;
    expect(new Uint8Array(buf ?? new ArrayBuffer(0))).toEqual(
      new Uint8Array([1, 2, 3])
    );
    expect(useDocumentStore.getState().documentPath).toBe("/test/deleted.docx");
    // 草稿恢复 → isDirty=true（内容可能与磁盘不一致）
    expect(useDocumentStore.getState().isDirty).toBe(true);
  });

  it("无草稿时不恢复任何文档", async () => {
    // 不设置 draft

    renderHook(() => useAutoSave());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(useDocumentStore.getState().documentBuffer).toBeNull();
    expect(useDocumentStore.getState().documentPath).toBeNull();
  });

  it("草稿 path 为空时不恢复", async () => {
    localStorage.setItem(DRAFT_KEY, makeDraft("", [1, 2, 3]));

    renderHook(() => useAutoSave());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReadFile).not.toHaveBeenCalled();
    // path 为空 → 不恢复
    expect(useDocumentStore.getState().documentBuffer).toBeNull();
  });
});
