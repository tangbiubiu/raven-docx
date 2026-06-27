// features/agent/hooks/useAgentCommands.ts — Agent 响应解析 + 命令执行
// 解析 Agent 返回文本，通过 EditorBridge 应用到文档
// Reference: .dev/plan/phase3-branch-plan.md §4.3-4.5, TSS §4.3

import { useCallback, useRef, useState } from "react";
import { useAgentStore } from "@/stores/useAgentStore";
import type { SelectionInfo } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import type { AgentSelectionContext } from "./useAgentContext";
import { useAgentContext } from "./useAgentContext";
import { useAgentSession } from "./useAgentSession";

// ============================================================
// 类型定义
// ============================================================

/** Agent 支持的操作类型 */
export type AgentActionType =
  | "rewrite"
  | "expand"
  | "summarize"
  | "translate"
  | "explain"
  | "fixGrammar"
  | "makeFormal"
  | "makeCasual"
  | "proofread"
  | "optimizeLayout";

/** Agent 返回的 DocumentAgent 命令 */
export type AgentCommand = {
  type: string;
  [key: string]: unknown;
};

/** 解析后的 Agent 响应 */
export type AgentResponse = {
  success: boolean;
  newText?: string;
  commands?: AgentCommand[];
  error?: string;
};

/** 待用户确认的建议 */
export type PendingSuggestion = {
  originalText: string;
  suggestedText: string;
  action: AgentActionType;
  position?: { top: number; left: number };
};

/** useAgentCommands 返回值 */
export type UseAgentCommandsReturn = {
  execute(
    action: AgentActionType,
    selectionCtx: AgentSelectionContext | null,
    customPrompt?: string
  ): Promise<void>;
  parseResponse(text: string): AgentResponse;
  applyResponse(response: AgentResponse): Promise<void>;
  rollback(): void;
  hasPendingSuggestion: boolean;
  pendingSuggestion: PendingSuggestion | null;
  acceptSuggestion(): Promise<void>;
  rejectSuggestion(): void;
};

// ============================================================
// 模块级常量
// ============================================================

/** markdown code fence 提取正则 */
const JSON_FENCE_RE = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;

/** 计算选区在视口中的坐标,用于定位 SuggestionPopover */
function resolveSuggestionPosition(
  info: SelectionInfo
): { top: number; left: number } | undefined {
  const bridge = useDocumentStore.getState().editorBridge;
  const view = bridge?.getEditorView();
  if (!view) {
    return;
  }
  try {
    const coords = view.coordsAtPos(info.from);
    return { top: coords.bottom + 8, left: coords.left };
  } catch {
    // coordsAtPos 在无效选区位置时抛错,忽略
    return;
  }
}

// ============================================================
// 纯函数：parseAgentResponse
// ============================================================

/**
 * 从 Agent 返回的原始文本中解析结构化响应。
 *
 * 解析策略：
 * 1. 尝试提取 ```json code fence 中的 JSON
 * 2. 若无 fence，尝试整体作为 JSON 解析
 * 3. JSON 解析失败 → 将整段文本视为 newText（纯文本替换）
 */
export function parseAgentResponse(text: string): AgentResponse {
  const jsonFenceMatch = text.match(JSON_FENCE_RE);
  const jsonCandidate = jsonFenceMatch?.[1]?.trim() ?? text.trim();

  try {
    const parsed = JSON.parse(jsonCandidate);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof parsed.error === "string" && parsed.error.length > 0) {
        return { success: false, error: parsed.error };
      }
      if (Array.isArray(parsed.commands)) {
        return { success: true, commands: parsed.commands as AgentCommand[] };
      }
      if (typeof parsed.newText === "string") {
        return { success: true, newText: parsed.newText };
      }
    }

    return { success: true, newText: text };
  } catch {
    return { success: true, newText: text };
  }
}

// ============================================================
// Hook: useAgentCommands
// ============================================================

/**
 * useAgentCommands — Agent 动作执行 Hook
 *
 * 衔接 useAgentSession（发送）和 EditorBridge（应用），
 * 提供完整的「发送 → 等待 → 解析 → 应用 → 回滚」流程。
 */
export function useAgentCommands(): UseAgentCommandsReturn {
  const { send } = useAgentSession();
  const { buildPrompt } = useAgentContext();

  const [pendingSuggestion, setPendingSuggestion] =
    useState<PendingSuggestion | null>(null);

  const snapshotRef = useRef<ArrayBuffer | null>(null);
  const pendingResponseRef = useRef<AgentResponse | null>(null);

  const hasPendingSuggestion = pendingSuggestion !== null;

  // ---- parseResponse ----

  const parseResponse = useCallback(
    (text: string): AgentResponse => parseAgentResponse(text),
    []
  );

  // ---- waitForAgentEnd ----

  const waitForAgentEnd = useCallback(
    (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const currentStatus = useAgentStore.getState().status;
        if (currentStatus !== "busy") {
          resolve();
          return;
        }

        const unsubscribe = useAgentStore.subscribe((state, prev) => {
          if (prev.status === "busy" && state.status === "ready") {
            unsubscribe();
            resolve();
          } else if (state.status === "error") {
            unsubscribe();
            reject(new Error(state.error ?? "Agent encountered an error"));
          }
        });
      }),
    []
  );

  // ---- applyCommands (路径 A) ----

  const applyCommands = useCallback(
    async (commands: AgentCommand[]): Promise<void> => {
      const bridge = useDocumentStore.getState().editorBridge;
      if (!bridge) {
        throw new Error("编辑器桥接不可用");
      }

      const agent = bridge.getAgent() as {
        executeCommands(cmds: unknown[]): Promise<void>;
      } | null;
      if (!agent) {
        throw new Error("DocumentAgent 不可用");
      }

      await agent.executeCommands(commands);
    },
    []
  );

  // ---- applyNewText (路径 B) ----

  const applyNewText = useCallback((newText: string): void => {
    const bridge = useDocumentStore.getState().editorBridge;
    if (!bridge) {
      throw new Error("编辑器桥接不可用");
    }

    const view = bridge.getEditorView();
    if (!view) {
      throw new Error("编辑器视图不可用");
    }

    const info = useDocumentStore.getState().selectionInfo;
    if (!info) {
      throw new Error("选区信息不可用");
    }

    const { state } = view;
    const tr = state.tr.replaceWith(
      info.from,
      info.to,
      state.schema.text(newText)
    );
    bridge.dispatchTransaction(tr);
  }, []);

  // ---- applyResponse ----

  const applyResponse = useCallback(
    async (response: AgentResponse): Promise<void> => {
      if (response.commands && response.commands.length > 0) {
        await applyCommands(response.commands);
      } else if (response.newText !== undefined) {
        applyNewText(response.newText);
      }
    },
    [applyCommands, applyNewText]
  );

  // ---- rollback ----

  const rollback = useCallback((): void => {
    const snapshot = snapshotRef.current;
    const path = useDocumentStore.getState().documentPath;

    if (snapshot && path) {
      useDocumentStore.getState().setDocument(null, snapshot, path);
    }

    snapshotRef.current = null;
    pendingResponseRef.current = null;
  }, []);

  // ---- acceptSuggestion / rejectSuggestion ----

  const acceptSuggestion = useCallback(async (): Promise<void> => {
    const response = pendingResponseRef.current;
    if (!response) {
      return;
    }

    await applyResponse(response);
    setPendingSuggestion(null);
    pendingResponseRef.current = null;
    snapshotRef.current = null;
  }, [applyResponse]);

  const rejectSuggestion = useCallback((): void => {
    setPendingSuggestion(null);
    pendingResponseRef.current = null;
    snapshotRef.current = null;
  }, []);

  // ---- execute helpers ----

  /**
   * 等待 Agent 响应并解析为 AgentResponse。
   */
  const awaitAgentResponse = useCallback(async (): Promise<AgentResponse> => {
    await waitForAgentEnd();

    const agentState = useAgentStore.getState();
    const lastAgentMsg = [...agentState.messages]
      .reverse()
      .find((m) => m.role === "agent");

    if (!lastAgentMsg?.content) {
      throw new Error("Agent 未返回任何响应");
    }

    const response = parseResponse(lastAgentMsg.content);
    if (!response.success) {
      throw new Error(response.error ?? "Agent 返回了错误");
    }

    return response;
  }, [waitForAgentEnd, parseResponse]);

  // ---- execute ----

  const execute = useCallback(
    async (
      action: AgentActionType,
      selectionCtx: AgentSelectionContext | null,
      customPrompt?: string
    ): Promise<void> => {
      const bridge = useDocumentStore.getState().editorBridge;

      if (bridge) {
        const snapshot = await bridge.save();
        snapshotRef.current = snapshot;
      }

      try {
        const prompt = buildPrompt(action, selectionCtx, customPrompt);
        await send(prompt, "steer");
        const response = await awaitAgentResponse();

        // 校对类动作 → SuggestionPopover
        const info = useDocumentStore.getState().selectionInfo;
        if (
          (action === "proofread" || action === "fixGrammar") &&
          response.newText &&
          info
        ) {
          pendingResponseRef.current = response;
          const position = resolveSuggestionPosition(info);
          setPendingSuggestion({
            originalText: info.text,
            suggestedText: response.newText,
            action,
            position,
          });
        }

        await applyResponse(response);
        snapshotRef.current = null;
      } catch (e) {
        if (snapshotRef.current) {
          try {
            rollback();
          } catch {
            // 回滚失败不做额外处理
          }
        }
        throw e;
      }
    },
    [send, buildPrompt, awaitAgentResponse, applyResponse, rollback]
  );
  return {
    execute,
    parseResponse,
    applyResponse,
    rollback,
    hasPendingSuggestion,
    pendingSuggestion,
    acceptSuggestion,
    rejectSuggestion,
  };
}
