// features/agent/hooks/__tests__/useAgentSession.test.ts
// computeDocHash 单元测试 + 事件监听器生命周期测试

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PiEventType } from "@/lib/tauri-events";
import { useAgentStore } from "@/stores/useAgentStore";
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
    for (const r of resolveQueue) {
      r();
    }
    await act(async () => {
      await Promise.resolve();
    });
  });
});
