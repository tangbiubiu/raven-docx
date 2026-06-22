// features/agent/hooks/useAgentSession.ts — Agent 会话生命周期管理
// 封装 agent_send/abort/status 命令和 Tauri Events 监听
// Reference: .dev/plan/phase3-branch-plan.md §2.3, TSS §4.2

import { useEffect } from "react";
import { commands } from "@/lib/bindings";
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

/**
 * useAgentSession — Agent 会话生命周期管理 Hook
 *
 * 封装 Tauri 命令调用和事件监听，提供完整的 Agent 交互能力。
 * 供 AgentSidebar、CommandPalette、QuickActions 等组件消费。
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
  const updateMessage = useAgentStore((s) => s.updateMessage);
  const finishStreaming = useAgentStore((s) => s.finishStreaming);
  const clearMessages = useAgentStore((s) => s.clearMessages);

  const documentPath = useDocumentStore((s) => s.documentPath);

  // 计算是否正在流式输出
  const isStreaming = status === "busy" && currentStreamingId !== null;

  // 监听 Tauri Events
  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    // text_delta: 流式文本增量
    onPiEvent("text_delta", (payload) => {
      const state = useAgentStore.getState();
      if (state.currentStreamingId) {
        const msg = state.messages.find(
          (m) => m.id === state.currentStreamingId
        );
        if (msg) {
          updateMessage(msg.id, msg.content + payload.text);
        }
      } else {
        // 如果没有 currentStreamingId，创建新的 agent 消息
        const agentMsg = createMessage("agent", payload.text, true);
        addMessage(agentMsg);
        useAgentStore.setState({ currentStreamingId: agentMsg.id });
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    // agent_end: 流式结束
    onPiEvent("agent_end", () => {
      const state = useAgentStore.getState();
      if (state.currentStreamingId) {
        finishStreaming(state.currentStreamingId);
      }
      setStatus("ready");
    }).then((unlisten) => unlisteners.push(unlisten));

    // error: 错误事件
    onPiEvent("error", (payload) => {
      setError(payload.message);
      const state = useAgentStore.getState();
      if (state.currentStreamingId) {
        finishStreaming(state.currentStreamingId);
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    return () => {
      for (const u of unlisteners) {
        u();
      }
    };
  }, [updateMessage, addMessage, finishStreaming, setStatus, setError]);

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
      // 计算 session_id（文档 hash）
      const sessionId = documentPath
        ? await computeDocHash(documentPath)
        : null;

      const result = await commands.agentSend(prompt, mode, sessionId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      finishStreaming(agentMsg.id);
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
