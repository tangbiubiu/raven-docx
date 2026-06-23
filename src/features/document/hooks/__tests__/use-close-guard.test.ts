// features/document/hooks/__tests__/use-close-guard.test.ts
// 窗口关闭拦截 hook 测试

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStore } from "@/stores/useAgentStore";
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
// mock @/lib/bindings — useCloseGuard 调用 commands.deleteTempFile
vi.mock("@/lib/bindings", () => ({
  commands: {
    deleteTempFile: vi.fn(
      async (_path: string): Promise<{ status: "ok"; data: null }> => ({
        status: "ok" as const,
        data: null,
      })
    ),
  },
}));

// mock @tauri-apps/api/window — useCloseGuard 调用 getCurrentWindow().destroy()
const mockDestroyWindow = vi.fn();
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ destroy: mockDestroyWindow }),
}));

import { commands } from "@/lib/bindings";
import { useCloseGuard } from "../use-close-guard";

describe("useCloseGuard", () => {
  beforeEach(() => {
    capturedHandler = null;
    useDocumentStore.getState().closeDocument();
    useAgentStore.getState().reset();
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

  it("handleSave 调用 saveDocument、清理临时文件并关闭窗口", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);
    useAgentStore.setState({ tempDocPath: "/test/.agent-tmp-doc.docx" });

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
    expect(useDocumentStore.getState().isDirty).toBe(false);
    // 保存成功 → 清理临时文件 + 销毁窗口
    expect(commands.deleteTempFile).toHaveBeenCalledWith(
      "/test/.agent-tmp-doc.docx"
    );
    expect(mockDestroyWindow).toHaveBeenCalledOnce();
  });

  it("handleSave 保存失败时不关闭窗口", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);

    const saveFn = vi.fn().mockResolvedValue(false);
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

    await act(async () => {
      await result.current.handleSave();
    });

    // 保存失败 → 不关闭窗口，保持 dirty
    expect(mockDestroyWindow).not.toHaveBeenCalled();
    expect(useDocumentStore.getState().isDirty).toBe(true);
  });

  it("handleDiscard 放弃更改、清理临时文件并关闭窗口", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);
    useAgentStore.setState({ tempDocPath: "/test/.agent-tmp-doc.docx" });

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
      await result.current.handleDiscard();
    });

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(false);
    expect(useDocumentStore.getState().isDirty).toBe(false);
    // 放弃更改 → 清理临时文件 + 销毁窗口
    expect(commands.deleteTempFile).toHaveBeenCalledWith(
      "/test/.agent-tmp-doc.docx"
    );
    expect(mockDestroyWindow).toHaveBeenCalledOnce();
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

  // ============================================================
  // 临时文件清理 — 窗口关闭放行时删除 agent 临时文件
  // ============================================================

  it("放行关闭时删除 agent 临时文件", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useAgentStore.setState({ tempDocPath: "/test/.agent-tmp-doc.docx" });

    const saveFn = vi.fn().mockResolvedValue(true);
    renderHook(() => useCloseGuard({ saveDocument: saveFn }));

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await capturedHandler?.(event);
    });

    // isDirty=false → 放行关闭 → 删除临时文件
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(commands.deleteTempFile).toHaveBeenCalledWith(
      "/test/.agent-tmp-doc.docx"
    );
  });

  it("无临时文件时放行关闭不报错", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    // tempDocPath 为 null

    const saveFn = vi.fn().mockResolvedValue(true);
    renderHook(() => useCloseGuard({ saveDocument: saveFn }));

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await capturedHandler?.(event);
    });

    expect(commands.deleteTempFile).not.toHaveBeenCalled();
  });

  it("isDirty=true 阻止关闭时不删除临时文件", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    useDocumentStore.getState().setDirty(true);
    useAgentStore.setState({ tempDocPath: "/test/.agent-tmp-doc.docx" });

    const saveFn = vi.fn().mockResolvedValue(true);
    renderHook(() => useCloseGuard({ saveDocument: saveFn }));

    await act(async () => {
      await Promise.resolve();
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await capturedHandler?.(event);
    });

    // 阻止关闭 → 不删除临时文件（用户可能取消，agent 仍需使用）
    expect(commands.deleteTempFile).not.toHaveBeenCalled();
  });
});
