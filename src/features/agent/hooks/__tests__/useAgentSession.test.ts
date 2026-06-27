// features/agent/hooks/__tests__/useAgentSession.test.ts
// computeDocHash 单元测试 + 事件监听器生命周期测试

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PiEventType } from "@/lib/tauri-events";
import { useAgentStore } from "@/stores/useAgentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { computeDocHash } from "../useAgentSession";

// pi session-id 合法字符集：字母、数字、'-'、'_'、'.'，首尾须为字母数字
const SESSION_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
const LEGAL_CHARS_RE = /^[a-zA-Z0-9._-]+$/;

describe("computeDocHash — session-id 合法性", () => {
  it("返回非空字符串", async () => {
    const hash = await computeDocHash("/path/to/doc.docx");
    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThan(0);
  });

  it("仅含合法字符 [a-zA-Z0-9._-]", async () => {
    const hash = await computeDocHash("/Users/test/Desktop/report.docx");
    expect(hash).toMatch(LEGAL_CHARS_RE);
  });

  it("首尾为字母数字", async () => {
    const hash = await computeDocHash("/Users/test/Desktop/report.docx");
    expect(hash).toMatch(SESSION_ID_RE);
  });

  it("不包含路径分隔符 / 或反斜杠", async () => {
    const hash = await computeDocHash("/Users/test/Desktop/report.docx");
    expect(hash).not.toContain("/");
    expect(hash).not.toContain("\\");
  });

  it("相同路径产生相同 hash（确定性）", async () => {
    const path = "/Users/biubiu/Desktop/周报.docx";
    const hash1 = await computeDocHash(path);
    const hash2 = await computeDocHash(path);
    expect(hash1).toBe(hash2);
  });

  it("不同路径产生不同 hash", async () => {
    const hash1 = await computeDocHash("/path/a.docx");
    const hash2 = await computeDocHash("/path/b.docx");
    expect(hash1).not.toBe(hash2);
  });

  it("中文路径也能生成合法 session-id", async () => {
    const hash = await computeDocHash(
      "/Users/biubiu/Desktop/周报-20260529-唐禹.docx"
    );
    expect(hash).toMatch(SESSION_ID_RE);
  });

  it("不再直接返回原始路径", async () => {
    const path = "/Users/test/Desktop/report.docx";
    const hash = await computeDocHash(path);
    expect(hash).not.toBe(path);
  });
});

// ============================================================
// 事件监听器生命周期 — 多实例只注册一套监听器
// ============================================================
// Bug: useAgentSession() 被 AgentSidebar + QuickActions 等多个组件调用，
// 每次调用都独立注册事件监听器 → 同一 delta 被处理 N 次（N=调用数）。
// 修复：模块级引用计数，多实例共享一套监听器。

// 追踪活跃监听器计数
let activeListeners = 0;
// 控制监听器 Promise 的 resolve 时机（模拟 Tauri IPC 异步延迟）
let resolveQueue: Array<() => void> = [];

vi.mock("@/lib/tauri-events", () => ({
  onPiEvent: vi.fn(
    <T extends PiEventType>(
      _type: T,
      _cb: (payload: unknown) => void
    ): Promise<() => void> => {
      activeListeners += 1;
      return new Promise((resolve) => {
        resolveQueue.push(() => {
          resolve(() => {
            activeListeners -= 1;
          });
        });
      });
    }
  ),
}));

// mock @/lib/bindings — reloadDocument 调用 reloadFromTemp + saveDocx
vi.mock("@/lib/bindings", () => ({
  commands: {
    reloadFromTemp: vi.fn(
      async (_tempPath: string): Promise<{ status: "ok"; data: number[] }> => ({
        status: "ok" as const,
        data: [1, 2, 3, 4], // 模拟 agent 修改后的 docx 字节
      })
    ),
    saveDocx: vi.fn(
      async (
        _path: string,
        _data: number[]
      ): Promise<{ status: "ok"; data: undefined }> => ({
        status: "ok" as const,
        data: undefined,
      })
    ),
  },
}));

// 需要在 mock 之后 import
import { useAgentSession } from "../useAgentSession";

describe("useAgentSession — 事件监听器生命周期", () => {
  beforeEach(() => {
    activeListeners = 0;
    resolveQueue = [];
    useAgentStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("多个 useAgentSession 实例只注册一套监听器", async () => {
    // 模拟 AgentSidebar + QuickActions 同时挂载
    const hook1 = renderHook(() => useAgentSession());
    const hook2 = renderHook(() => useAgentSession());

    // resolve pending Promise
    for (const r of resolveQueue) {
      r();
    }
    resolveQueue = [];
    await act(async () => {
      await Promise.resolve();
    });

    // 期望：只有一套监听器（3 个），不是 6 个
    expect(activeListeners).toBe(3);

    // 卸载一个实例，监听器仍应存活（另一个实例仍需要）
    hook1.unmount();
    for (const r of resolveQueue) {
      r();
    }
    await act(async () => {
      await Promise.resolve();
    });
    expect(activeListeners).toBe(3);

    // 卸载最后一个实例，监听器才释放
    hook2.unmount();
    for (const r of resolveQueue) {
      r();
    }
    await act(async () => {
      await Promise.resolve();
    });
    expect(activeListeners).toBe(0);
  });

  it("text_delta 事件只触发一次（多实例无重复处理）", async () => {
    // 两个实例并存
    const hook1 = renderHook(() => useAgentSession());
    const hook2 = renderHook(() => useAgentSession());

    // resolve pending Promise
    for (const r of resolveQueue) {
      r();
    }
    resolveQueue = [];
    await act(async () => {
      await Promise.resolve();
    });

    // 获取 onPiEvent mock 的回调
    const { onPiEvent } = await import("@/lib/tauri-events");
    const mockOnPiEvent = vi.mocked(onPiEvent);

    // 设置 streaming 消息
    act(() => {
      useAgentStore.setState({
        currentStreamingId: "msg-1",
        messages: [
          {
            id: "msg-1",
            role: "agent",
            content: "",
            isStreaming: true,
            timestamp: Date.now(),
          },
        ],
      });
    });

    // 模拟 text_delta 事件：只应被处理一次
    const textDeltaCalls = mockOnPiEvent.mock.calls.filter(
      (call) => call[0] === "text_delta"
    );
    expect(textDeltaCalls.length).toBe(1);
    const textDeltaCb = textDeltaCalls[0]?.[1] as (p: { text: string }) => void;

    act(() => {
      textDeltaCb({ text: "hello" });
    });

    // 期望 "hello" 而非 "hellohello"
    const state = useAgentStore.getState();
    const msg = state.messages.find((m) => m.id === "msg-1");
    expect(msg?.content).toBe("hello");

    hook1.unmount();
    hook2.unmount();
  });
});
// ============================================================
// agent_end + documentDirty — reloadDocument 自动落盘测试
// ============================================================
// Bug: agent 修改文档后 reloadDocument 只更新内存 buffer，原文件未写回。
// 关闭 Raven 侧边栏/窗口时修改丢失，但 localStorage 草稿保留了 buffer，
// 导致「再次打开 Raven 修改还在，但 Word/WPS 打开原文件看不到修改」。
// 修复：reloadDocument 读回 buffer 后自动写回原文件，isDirty=false。

describe("useAgentSession — agent_end documentDirty 重载", () => {
  beforeEach(() => {
    activeListeners = 0;
    resolveQueue = [];
    useAgentStore.getState().reset();
    useDocumentStore.getState().closeDocument();
    vi.clearAllMocks();
  });

  it("documentDirty=true 时自动写回原文件，isDirty 为 false", async () => {
    // 准备：打开一个文档
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");
    expect(useDocumentStore.getState().isDirty).toBe(false);

    // 挂载 hook 注册监听器
    const { unmount } = renderHook(() => useAgentSession());
    for (const r of resolveQueue) {
      r();
    }
    resolveQueue = [];
    await act(async () => {
      await Promise.resolve();
    });

    // 设置 tempDocPath（agent_end 需要它来触发 reload）
    useAgentStore.setState({ tempDocPath: "/tmp/.agent-tmp-doc.docx" });

    // 获取 agent_end 回调
    const { onPiEvent } = await import("@/lib/tauri-events");
    const mockOnPiEvent = vi.mocked(onPiEvent);
    const agentEndCalls = mockOnPiEvent.mock.calls.filter(
      (c) => c[0] === "agent_end"
    );
    expect(agentEndCalls.length).toBe(1);
    const agentEndCb = agentEndCalls[0]?.[1] as (p: {
      documentDirty: boolean;
    }) => void;

    // 触发 agent_end（documentDirty=true → reloadDocument → 自动落盘）
    await act(async () => {
      agentEndCb({ documentDirty: true });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // 期望：buffer 已更新为 reloadFromTemp 返回的数据
    expect(useDocumentStore.getState().documentBuffer).toBeInstanceOf(
      ArrayBuffer
    );
    expect(
      new Uint8Array(
        useDocumentStore.getState().documentBuffer ?? new ArrayBuffer(0)
      )
    ).toEqual(new Uint8Array([1, 2, 3, 4]));

    // 核心断言：saveDocx 被调用，写回原文件
    const { commands } = await import("@/lib/bindings");
    const mockSaveDocx = vi.mocked(commands.saveDocx);
    expect(mockSaveDocx).toHaveBeenCalledOnce();
    expect(mockSaveDocx.mock.calls[0]?.[0]).toBe("/test/doc.docx");
    expect(mockSaveDocx.mock.calls[0]?.[1]).toEqual([1, 2, 3, 4]);

    // 已落盘 → isDirty 应为 false
    expect(useDocumentStore.getState().isDirty).toBe(false);

    unmount();
    for (const r of resolveQueue) {
      r();
    }
  });

  it("documentDirty=true 但 documentPath=null（新建文档）时不写回，isDirty=true", async () => {
    // 准备：新建文档（无 documentPath）
    useDocumentStore.getState().setDocument(null, new ArrayBuffer(4), null);
    useAgentStore.setState({ tempDocPath: "/tmp/.agent-tmp-doc.docx" });

    const { unmount } = renderHook(() => useAgentSession());
    for (const r of resolveQueue) {
      r();
    }
    resolveQueue = [];
    await act(async () => {
      await Promise.resolve();
    });

    const { onPiEvent } = await import("@/lib/tauri-events");
    const mockOnPiEvent = vi.mocked(onPiEvent);
    const agentEndCb = mockOnPiEvent.mock.calls.find(
      (c) => c[0] === "agent_end"
    )?.[1] as (p: { documentDirty: boolean }) => void;

    await act(async () => {
      agentEndCb({ documentDirty: true });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // 新建文档无路径 → 不调用 saveDocx
    const { commands } = await import("@/lib/bindings");
    const mockSaveDocx = vi.mocked(commands.saveDocx);
    expect(mockSaveDocx).not.toHaveBeenCalled();

    // 未落盘 → isDirty=true，提示用户手动另存为
    expect(useDocumentStore.getState().isDirty).toBe(true);

    unmount();
    for (const r of resolveQueue) {
      r();
    }
  });

  it("documentDirty=false 时不重载文档，isDirty 保持 false", async () => {
    useDocumentStore
      .getState()
      .setDocument(null, new ArrayBuffer(4), "/test/doc.docx");

    const { unmount } = renderHook(() => useAgentSession());
    for (const r of resolveQueue) {
      r();
    }
    resolveQueue = [];
    await act(async () => {
      await Promise.resolve();
    });

    useAgentStore.setState({ tempDocPath: "/tmp/.agent-tmp-doc.docx" });

    const { onPiEvent } = await import("@/lib/tauri-events");
    const mockOnPiEvent = vi.mocked(onPiEvent);
    const agentEndCb = mockOnPiEvent.mock.calls.find(
      (c) => c[0] === "agent_end"
    )?.[1] as (p: { documentDirty: boolean }) => void;

    await act(async () => {
      agentEndCb({ documentDirty: false });
      await Promise.resolve();
    });

    // 未重载，isDirty 不变
    expect(useDocumentStore.getState().isDirty).toBe(false);

    unmount();
    for (const r of resolveQueue) {
      r();
    }
  });
});
