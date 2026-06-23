// features/document/hooks/__tests__/use-close-guard.test.ts
// 窗口关闭拦截 hook 测试

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";

// 控制 onCloseRequested 回调的捕获
let capturedHandler:
  | ((event: { preventDefault: () => void }) => Promise<void>)
  | null = null;

vi.mock("@/lib/tauri-events", () => ({
  onCloseRequested: vi.fn(
    (
      handler: (event: { preventDefault: () => void }) => Promise<void>
    ): Promise<() => void> => {
      capturedHandler = handler;
      return Promise.resolve(() => {
        capturedHandler = null;
      });
    }
  ),
}));

import { useCloseGuard } from "../use-close-guard";

describe("useCloseGuard", () => {
  beforeEach(() => {
    capturedHandler = null;
    useDocumentStore.getState().closeDocument();
    vi.clearAllMocks();
  });

  afterEach(() => {
    capturedHandler = null;
  });

  it("isDirty=false 时关闭请求直接放行（不弹对话框）", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    // isDirty 默认 false
    expect(useDocumentStore.getState().isDirty).toBe(false);

    const saveFn = vi.fn().mockResolvedValue(true);
    renderHook(() => useCloseGuard({ saveDocument: saveFn }));

    // 等待监听器注册
    await act(async () => {
      await Promise.resolve();
    });

    expect(capturedHandler).not.toBeNull();
    const event = { preventDefault: vi.fn() };

    await act(async () => {
      await capturedHandler?.(event);
    });

    // 不阻止关闭，不调用保存，不弹对话框
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(saveFn).not.toHaveBeenCalled();
  });

  it("isDirty=true 时阻止关闭并弹对话框", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);

    const saveFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useCloseGuard({ saveDocument: saveFn })
    );

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };

    await act(async () => {
      await capturedHandler?.(event);
    });

    // 阻止关闭
    expect(event.preventDefault).toHaveBeenCalledOnce();
    // 对话框打开
    expect(result.current.confirmOpen).toBe(true);
    // 尚未调用保存
    expect(saveFn).not.toHaveBeenCalled();
  });

  it("handleSave 调用 saveDocument 并关闭对话框", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);

    const saveFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useCloseGuard({ saveDocument: saveFn })
    );

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await capturedHandler?.(event);
    });

    expect(result.current.confirmOpen).toBe(true);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(saveFn).toHaveBeenCalledOnce();
    expect(result.current.confirmOpen).toBe(false);
    // 保存后 isDirty 应为 false
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it("handleDiscard 关闭对话框并标记为不再 dirty", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);

    const saveFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useCloseGuard({ saveDocument: saveFn })
    );

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await capturedHandler?.(event);
    });

    expect(result.current.confirmOpen).toBe(true);
    act(() => {
      result.current.handleDiscard();
    });

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(false);
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it("handleCancel 关闭对话框且保持 dirty", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);

    const saveFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useCloseGuard({ saveDocument: saveFn })
    );

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await capturedHandler?.(event);
    });

    expect(result.current.confirmOpen).toBe(true);

    act(() => {
      result.current.handleCancel();
    });

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(false);
    // 取消 → 仍 dirty，用户可继续编辑
    expect(useDocumentStore.getState().isDirty).toBe(true);
  });
});
