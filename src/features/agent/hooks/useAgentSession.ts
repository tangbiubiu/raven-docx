// features/agent/hooks/useAgentSession.ts — Agent 会话生命周期管理
// 封装 agent_send/abort/status 命令和 Tauri Events 监听
// Reference: .dev/plan/phase3-branch-plan.md §2.3, TSS §4.2

import { useEffect } from "react";
import { commands } from "@/lib/bindings";
import type { PiEventPayloads, PiEventType } from "@/lib/tauri-events";
import { onPiEvent } from "@/lib/tauri-events";
import type {
  AgentContextBadge,
  AgentMessage,
  AgentSessionStatus,
} from "@/stores/useAgentStore";
import { createMessage, useAgentStore } from "@/stores/useAgentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

/**
 * Agent 发送模式
 */
export type AgentSendMode = "default" | "steer" | "enqueue";

/**
 * useAgentSession 返回值类型
 */
export type UseAgentSessionReturn = {
  // 状态
  status: AgentSessionStatus;
  error: string | null;
  messages: AgentMessage[];
  isStreaming: boolean;

  // 操作
  send: (prompt: string, mode?: AgentSendMode) => Promise<string>;
  abort: () => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;

  // 上下文
  contextBadge: AgentContextBadge | null;
};

// ============================================================
// 模块级事件监听器单例（引用计数）
// ============================================================
// useAgentSession() 被 AgentSidebar、QuickActions 等多个组件调用，
// 但 pi 事件监听器只需注册一次。用引用计数管理：
// 第一个实例 mount 时注册，最后一个实例 unmount 时注销。

let listenerRefCount = 0;
let listenerCleanup: (() => void) | null = null;

/** 从临时文件重载文档（agent 修改后显示 tracked changes）。
 * 读回 buffer 后自动写回原文件——agent 修改即落盘，
 * 避免关闭 Raven/窗口时原文件未更新导致修改丢失。
 */
async function reloadDocument(tempPath: string): Promise<void> {
  try {
    const result = await commands.reloadFromTemp(tempPath);
    if (result.status !== "ok") {
      return;
    }
    const data = result.data;
    const buffer = new Uint8Array(data).buffer;
    const docState = useDocumentStore.getState();
    const { documentPath } = docState;

    // 更新内存 buffer（编辑器重载 tracked changes）
    docState.setDocument(null, buffer, documentPath);

    // 写回原文件——agent 修改即落盘
    if (documentPath) {
      const saveResult = await commands.saveDocx(documentPath, data);
      if (saveResult.status === "ok") {
        docState.setDirty(false);
      } else {
        // 写回失败：保留 isDirty=true，提示用户手动保存
        docState.setDirty(true);
        useAgentStore.getState().setError(`自动保存失败: ${saveResult.error}`);
      }
    } else {
      // 新建文档无路径，无法自动落盘，标记 dirty 提示用户另存为
      docState.setDirty(true);
    }
  } catch (e) {
    useAgentStore
      .getState()
      .setError(`文档重载失败: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    useAgentStore.setState({ isEditorLocked: false });
  }
}

/** 注册 pi 事件监听器（引用计数为 1 时调用） */
function registerListeners(): void {
  // 用数组收集异步 unlisten 函数 + cancelled 标志
  // 处理 onPiEvent 返回 Promise<UnlistenFn> 的生命周期
  let cancelled = false;
  const unlisteners: Array<() => void> = [];

  function track<T extends PiEventType>(
    type: T,
    cb: (payload: PiEventPayloads[T]) => void
  ): void {
    onPiEvent(type, cb).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlisteners.push(unlisten);
      }
    });
  }

  // text_delta: 流式文本增量
  track("text_delta", (payload) => {
    const state = useAgentStore.getState();
    if (state.currentStreamingId) {
      const msg = state.messages.find((m) => m.id === state.currentStreamingId);
      if (msg) {
        state.updateMessage(msg.id, msg.content + payload.text);
      }
    } else {
      // 如果没有 currentStreamingId，创建新的 agent 消息
      const agentMsg = createMessage("agent", payload.text, true);
      state.addMessage(agentMsg);
      useAgentStore.setState({ currentStreamingId: agentMsg.id });
    }
  });

  // agent_end: 流式结束，若文档被修改则重载
  track("agent_end", (payload) => {
    const state = useAgentStore.getState();
    if (state.currentStreamingId) {
      state.finishStreaming(state.currentStreamingId);
    }
    state.setStatus("ready");

    // 文档被修改 → 从临时文件重载
    if (payload.documentDirty && state.tempDocPath) {
      reloadDocument(state.tempDocPath);
    } else {
      useAgentStore.setState({ isEditorLocked: false });
    }
  });

  // error: 错误事件
  track("error", (payload) => {
    const state = useAgentStore.getState();
    state.setError(payload.message);
    if (state.currentStreamingId) {
      state.finishStreaming(state.currentStreamingId);
    }
    useAgentStore.setState({ isEditorLocked: false });
  });

  listenerCleanup = () => {
    cancelled = true;
    for (const u of unlisteners) {
      u();
    }
    unlisteners.length = 0;
    listenerCleanup = null;
  };
}

/** 引用计数 +1，首次调用注册监听器 */
function acquireListeners(): void {
  listenerRefCount += 1;
  if (listenerRefCount === 1) {
    registerListeners();
  }
}

/** 引用计数 -1，归零时注销监听器 */
function releaseListeners(): void {
  listenerRefCount = Math.max(0, listenerRefCount - 1);
  if (listenerRefCount === 0 && listenerCleanup) {
    listenerCleanup();
  }
}

/**
 * useAgentSession — Agent 会话生命周期管理 Hook
 *
 * 封装 Tauri 命令调用和事件监听，提供完整的 Agent 交互能力。
 * 供 AgentSidebar、CommandPalette、QuickActions 等组件消费。
 * 事件监听器通过模块级引用计数单例管理，多实例共享一套监听器。
 *
 * @returns UseAgentSessionReturn
 *
 * @example
 * ```tsx
 * function AgentInput() {
 *   const { send, isStreaming, abort } = useAgentSession();
 *
 *   const handleSend = async () => {
 *     if (isStreaming) {
 *       await abort();
 *     } else {
 *       await send("润色这段文字");
 *     }
 *   };
 *
 *   return <button onClick={handleSend}>{isStreaming ? "停止" : "发送"}</button>;
 * }
 * ```
 */
export function useAgentSession(): UseAgentSessionReturn {
  const status = useAgentStore((s) => s.status);
  const error = useAgentStore((s) => s.error);
  const messages = useAgentStore((s) => s.messages);
  const contextBadge = useAgentStore((s) => s.contextBadge);
  const currentStreamingId = useAgentStore((s) => s.currentStreamingId);

  const setStatus = useAgentStore((s) => s.setStatus);
  const setError = useAgentStore((s) => s.setError);
  const addMessage = useAgentStore((s) => s.addMessage);
  const finishStreaming = useAgentStore((s) => s.finishStreaming);
  const clearMessages = useAgentStore((s) => s.clearMessages);

  // 计算是否正在流式输出
  const isStreaming = status === "busy" && currentStreamingId !== null;

  // 引用计数注册事件监听器（多实例共享一套）
  useEffect(() => {
    acquireListeners();
    return () => releaseListeners();
  }, []);

  /** 保存当前文档 buffer 到临时文件，返回路径（无文档时返回 null） */
  async function prepareTempDoc(): Promise<string | null> {
    const docState = useDocumentStore.getState();
    const hasDocument =
      Boolean(docState.documentBuffer) || docState.isNewDocument;
    if (!(hasDocument && docState.editorBridge)) {
      return null;
    }
    const buffer = await docState.editorBridge.save();
    if (!buffer) {
      return null;
    }
    const name = docState.documentPath ? null : "untitled";
    const result = await commands.saveBufferToTemp(
      Array.from(new Uint8Array(buffer)),
      docState.documentPath,
      name
    );
    if (result.status !== "ok") {
      return null;
    }
    useAgentStore.setState({
      tempDocPath: result.data,
      isEditorLocked: true,
    });
    return result.data;
  }

  /**
   * 发送 prompt 给 Agent
   */
  const send = async (
    prompt: string,
    mode: AgentSendMode = "default"
  ): Promise<string> => {
    // 添加用户消息
    const userMsg = createMessage("user", prompt);
    addMessage(userMsg);

    // 创建空的 agent 消息占位（流式填充）
    const agentMsg = createMessage("agent", "", true);
    addMessage(agentMsg);
    useAgentStore.setState({ currentStreamingId: agentMsg.id });

    setStatus("busy");
    setError(null);

    try {
      // 准备临时文档：保存当前 buffer 到临时文件，设为 RAVEN_DOCX_PATH
      const tempPath = await prepareTempDoc();
      const docState = useDocumentStore.getState();

      // 计算 session_id（文档 hash）
      const sessionId = docState.documentPath
        ? await computeDocHash(docState.documentPath)
        : null;

      const result = await commands.agentSend(
        prompt,
        mode,
        sessionId,
        tempPath
      );
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // 凭证未配置时设置特殊状态，前端显示引导 UI
      if (errorMsg.includes("凭证未配置")) {
        setStatus("not_configured");
      }
      setError(errorMsg);
      finishStreaming(agentMsg.id);
      // 错误时解锁编辑器
      useAgentStore.setState({ isEditorLocked: false });
      throw err;
    }
  };

  /**
   * 中止当前 Agent 操作
   */
  const abort = async (): Promise<void> => {
    try {
      const result = await commands.agentAbort();
      if (result.status === "error") {
        throw new Error(result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw err;
    }
  };

  /**
   * 重试最后一条消息
   */
  const retry = async (): Promise<void> => {
    const state = useAgentStore.getState();
    const lastUserMsg = [...state.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMsg) {
      await send(lastUserMsg.content);
    }
  };

  /**
   * 清空消息
   */
  const clear = (): void => {
    clearMessages();
    setStatus("ready");
    setError(null);
  };

  return {
    status,
    error,
    messages,
    isStreaming,
    send,
    abort,
    retry,
    clear,
    contextBadge,
  };
}

/**
 * 计算文档路径的 hash，用作 pi agent 的 session-id。
 *
 * pi 对 session-id 有字符集约束：仅允许 [a-zA-Z0-9._-]，首尾须为字母数字。
 * 直接传文档路径会因含路径分隔符 `/` 被 pi 拒绝（启动即退出）。
 * 这里用 SHA-256 取前 16 个 hex 字符，满足约束且足够唯一。
 */
export async function computeDocHash(path: string): Promise<string> {
  const data = new TextEncoder().encode(path);
  const digest = await crypto.subtle.digest("SHA-256", data);
  // 转为 hex 字符串，取前 16 位（hex 仅含 [0-9a-f]，完全合法）
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
