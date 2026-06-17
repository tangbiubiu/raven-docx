// features/review/hooks/useComments.ts — 批注管理 Hook (Comments Management Hook)
// 管理批注的增删改查，支持回复、解决、删除
// 若 @eigenpal/docx-editor-agents 未提供批注 API，使用本地状态占位
// Reference: .dev/plan/phase4-branch-plan.md §3.2, .dev/requirements/requirements-functional.md F-120~122

import { useCallback, useState } from "react";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** 单条批注回复 */
export type CommentReply = {
  id: string;
  author: string;
  text: string;
  createdAt: number; // Unix timestamp (ms)
};

/** 批注条目 */
export type Comment = {
  id: string;
  author: string;
  text: string;
  createdAt: number; // Unix timestamp (ms)
  replies: CommentReply[];
  resolved: boolean;
  /** 批注关联的文档选区范围（可选） */
  range?: { from: number; to: number };
  /** 批注关联的段落 ID（可选） */
  paraId?: string;
};

/** DocumentAgent 批注接口（最小契约） */
type AgentCommentApi = {
  addComment(
    text: string,
    range?: { from: number; to: number }
  ): Promise<unknown>;
  replyToComment(commentId: string, text: string): Promise<unknown>;
  resolveComment(commentId: string): Promise<unknown>;
  deleteComment(commentId: string): Promise<unknown>;
};

/** 生成唯一 ID */
function generateId(): string {
  return `cmt_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}

/** 尝试从 editorBridge 获取 Agent 批注 API */
function getAgentCommentApi(
  bridge: { getAgent(): unknown } | null
): AgentCommentApi | null {
  if (!bridge) {
    return null;
  }
  const agent = bridge.getAgent();
  if (!agent || typeof agent !== "object") {
    return null;
  }

  const a = agent as Record<string, unknown>;
  const hasAll =
    typeof a.addComment === "function" &&
    typeof a.replyToComment === "function" &&
    typeof a.resolveComment === "function" &&
    typeof a.deleteComment === "function";

  if (!hasAll) {
    return null;
  }

  // Library boundary: agent object shape validated above, cast is safe
  return agent as unknown as AgentCommentApi;
}

/**
 * useComments — 批注增删改查 Hook。
 *
 * 优先使用 DocumentAgent 批注 API；若不可用则本地状态占位。
 */
export function useComments() {
  const editorBridge = useDocumentStore((s) => s.editorBridge);
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);

  const [comments, setComments] = useState<Comment[]>([]);

  /** 添加批注 */
  const addComment = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      const range =
        selectionInfo !== null && selectionInfo.from !== selectionInfo.to
          ? { from: selectionInfo.from, to: selectionInfo.to }
          : undefined;

      const api = getAgentCommentApi(editorBridge);
      if (api) {
        try {
          await api.addComment(text, range);
          // Agent 处理后刷新（此处本地同步占位）
        } catch {
          // Agent 调用失败，降级到本地
        }
      }

      // 本地状态同步（占位或与 Agent 结果合并）
      const newComment: Comment = {
        id: generateId(),
        author: "我",
        text: text.trim(),
        createdAt: Date.now(),
        replies: [],
        resolved: false,
        range,
        paraId: selectionInfo?.paraId,
      };
      setComments((prev) => [...prev, newComment]);
    },
    [editorBridge, selectionInfo]
  );

  /** 回复批注 */
  const replyToComment = useCallback(
    async (commentId: string, text: string) => {
      if (!text.trim()) {
        return;
      }

      const api = getAgentCommentApi(editorBridge);
      if (api) {
        try {
          await api.replyToComment(commentId, text);
        } catch {
          // 降级到本地
        }
      }

      const reply: CommentReply = {
        id: generateId(),
        author: "我",
        text: text.trim(),
        createdAt: Date.now(),
      };
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
        )
      );
    },
    [editorBridge]
  );

  /** 解决批注 */
  const resolveComment = useCallback(
    async (commentId: string) => {
      const api = getAgentCommentApi(editorBridge);
      if (api) {
        try {
          await api.resolveComment(commentId);
        } catch {
          // 降级到本地
        }
      }

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
      );
    },
    [editorBridge]
  );

  /** 删除批注 */
  const deleteComment = useCallback(
    async (commentId: string) => {
      const api = getAgentCommentApi(editorBridge);
      if (api) {
        try {
          await api.deleteComment(commentId);
        } catch {
          // 降级到本地
        }
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [editorBridge]
  );

  /** 是否有选区（用于控制「添加批注」按钮是否可用） */
  const hasSelection =
    selectionInfo !== null && selectionInfo.from !== selectionInfo.to;

  return {
    comments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    hasSelection,
    commentCount: comments.filter((c) => !c.resolved).length,
  };
}
