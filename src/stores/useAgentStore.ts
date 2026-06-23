// useAgentStore — Agent 会话状态 (Agent Session State)
// 管理 Agent 连接状态、消息流、流式输出、上下文徽章
// Reference: .dev/docs/modules/stores.md §3

import { create } from "zustand";

/** Agent 会话状态 */
export type AgentSessionStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "busy"
  | "error"
  | "not_configured";

/** Agent 消息角色 */
export type AgentMessageRole = "user" | "agent" | "system";

/** 单条 Agent 消息 */
export type AgentMessage = {
  id: string;
  role: AgentMessageRole;
  content: string;
  isStreaming: boolean;
  timestamp: number;
};

/** 上下文徽章 — 显示 Agent 当前感知的文档位置 */
export type AgentContextBadge = {
  text: string; // 如 "光标: §4.2"
  type: "cursor" | "selection";
};

/** Agent 会话状态 */
export type AgentState = {
  // --- 会话 ---
  status: AgentSessionStatus;
  error: string | null;

  // --- 消息 ---
  messages: AgentMessage[];

  // --- 上下文 ---
  contextBadge: AgentContextBadge | null;

  // --- 流式 ---
  currentStreamingId: string | null; // 正在流式输出的消息 ID

  // --- 文档锁定 ---
  isEditorLocked: boolean; // agent 工作时锁定编辑器
  tempDocPath: string | null; // 当前 agent 工作的临时文档路径

  // --- Actions ---
  setStatus(status: AgentSessionStatus): void;
  setError(error: string | null): void;
  addMessage(message: AgentMessage): void;
  updateMessage(id: string, content: string): void; // 流式追加
  finishStreaming(id: string): void;
  setContextBadge(badge: AgentContextBadge | null): void;
  setEditorLocked(locked: boolean): void;
  setTempDocPath(path: string | null): void;
  clearMessages(): void;
  reset(): void; // 断开连接时重置
};

/**
 * 生成唯一消息 ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 创建 Agent 消息的便捷工厂
 */
export function createMessage(
  role: AgentMessageRole,
  content: string,
  isStreaming = false
): AgentMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    isStreaming,
    timestamp: Date.now(),
  };
}

const initialAgentState = {
  status: "disconnected" as AgentSessionStatus,
  error: null,
  messages: [],
  contextBadge: null,
  currentStreamingId: null,
  isEditorLocked: false,
  tempDocPath: null,
} as const satisfies Partial<AgentState>;

export const useAgentStore = create<AgentState>((set, get) => ({
  ...initialAgentState,

  setStatus(status) {
    set({ status, error: status === "error" ? get().error : null });
  },

  setError(error) {
    set({ error, status: error ? "error" : get().status });
  },

  addMessage(message) {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage(id, content) {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    }));
  },

  finishStreaming(id) {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
      currentStreamingId: null,
    }));
  },

  setContextBadge(badge) {
    set({ contextBadge: badge });
  },

  setEditorLocked(locked) {
    set({ isEditorLocked: locked });
  },

  setTempDocPath(path) {
    set({ tempDocPath: path });
  },

  clearMessages() {
    set({ messages: [], currentStreamingId: null });
  },

  reset() {
    set({
      status: "disconnected",
      error: null,
      messages: [],
      contextBadge: null,
      currentStreamingId: null,
      isEditorLocked: false,
      tempDocPath: null,
    });
  },
}));
