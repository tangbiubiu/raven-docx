// features/review/hooks/__tests__/use-comments.test.ts — useComments Hook 测试
// TDD: 验证批注增删改查、Agent API 集成、降级逻辑
// Reference: .dev/plan/phase4-branch-plan.md §4.3

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorBridge } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useComments } from "../use-comments";

describe("useComments", () => {
  beforeEach(() => {
    useDocumentStore.setState({
      editorBridge: null,
      selectionInfo: null,
    });
  });

  describe("初始状态", () => {
    it("comments 初始为空数组", () => {
      const { result } = renderHook(() => useComments());
      expect(result.current.comments).toEqual([]);
    });

    it("commentCount 初始为 0", () => {
      const { result } = renderHook(() => useComments());
      expect(result.current.commentCount).toBe(0);
    });

    it("hasSelection 初始为 false（无选区）", () => {
      const { result } = renderHook(() => useComments());
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe("addComment", () => {
    it("添加批注后 comments 长度增加", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("这是第一条批注");
      });

      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0].text).toBe("这是第一条批注");
    });

    it("添加批注后 commentCount 增加", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("批注内容");
      });

      expect(result.current.commentCount).toBe(1);
    });

    it("添加的批注作者为「我」", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("测试批注");
      });

      expect(result.current.comments[0].author).toBe("我");
    });

    it("添加的批注 resolved 为 false", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("测试批注");
      });

      expect(result.current.comments[0].resolved).toBe(false);
    });

    it("添加的批注 replies 为空数组", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("测试批注");
      });

      expect(result.current.comments[0].replies).toEqual([]);
    });

    it("空文本不添加批注", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("");
      });

      expect(result.current.comments).toHaveLength(0);
    });

    it("空白文本不添加批注", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("   ");
      });

      expect(result.current.comments).toHaveLength(0);
    });

    it("有选区时添加批注包含 range", async () => {
      useDocumentStore.setState({
        selectionInfo: {
          text: "测试文本",
          from: 10,
          to: 20,
          paraId: "p1",
        },
      });

      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("选区批注");
      });

      expect(result.current.comments[0].range).toEqual({ from: 10, to: 20 });
      expect(result.current.comments[0].paraId).toBe("p1");
    });

    it("无选区时添加批注 range 为 undefined", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("无选区批注");
      });

      expect(result.current.comments[0].range).toBeUndefined();
    });

    it("选区 from === to 时 range 为 undefined", async () => {
      useDocumentStore.setState({
        selectionInfo: {
          text: "测试文本",
          from: 10,
          to: 10,
          paraId: "p1",
        },
      });

      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("光标位置批注");
      });

      expect(result.current.comments[0].range).toBeUndefined();
    });
  });

  describe("replyToComment", () => {
    it("回复批注后 replies 长度增加", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("原始批注");
      });

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.replyToComment(commentId, "这是回复");
      });

      expect(result.current.comments[0].replies).toHaveLength(1);
      expect(result.current.comments[0].replies[0].text).toBe("这是回复");
    });

    it("回复的作者为「我」", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("原始批注");
      });

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.replyToComment(commentId, "回复内容");
      });

      expect(result.current.comments[0].replies[0].author).toBe("我");
    });

    it("空回复文本不添加回复", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("原始批注");
      });

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.replyToComment(commentId, "");
      });

      expect(result.current.comments[0].replies).toHaveLength(0);
    });

    it("多条回复按顺序添加", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("原始批注");
      });

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.replyToComment(commentId, "回复1");
        await result.current.replyToComment(commentId, "回复2");
      });

      expect(result.current.comments[0].replies).toHaveLength(2);
      expect(result.current.comments[0].replies[0].text).toBe("回复1");
      expect(result.current.comments[0].replies[1].text).toBe("回复2");
    });
  });

  describe("resolveComment", () => {
    it("解决批注后 resolved 为 true", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("待解决批注");
      });

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.resolveComment(commentId);
      });

      expect(result.current.comments[0].resolved).toBe(true);
    });

    it("解决批注后 commentCount 减少", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("批注1");
        await result.current.addComment("批注2");
      });

      expect(result.current.commentCount).toBe(2);

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.resolveComment(commentId);
      });

      expect(result.current.commentCount).toBe(1);
    });

    it("解决不存在的批注不影响现有批注", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("批注");
      });

      await act(async () => {
        await result.current.resolveComment("non-existent-id");
      });

      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0].resolved).toBe(false);
    });
  });

  describe("deleteComment", () => {
    it("删除批注后 comments 长度减少", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("待删除批注");
      });

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.deleteComment(commentId);
      });

      expect(result.current.comments).toHaveLength(0);
    });

    it("删除批注后 commentCount 减少", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("批注1");
        await result.current.addComment("批注2");
      });

      expect(result.current.commentCount).toBe(2);

      const commentId = result.current.comments[0].id;

      await act(async () => {
        await result.current.deleteComment(commentId);
      });

      expect(result.current.commentCount).toBe(1);
    });

    it("删除不存在的批注不影响现有批注", async () => {
      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("批注");
      });

      await act(async () => {
        await result.current.deleteComment("non-existent-id");
      });

      expect(result.current.comments).toHaveLength(1);
    });
  });

  describe("hasSelection", () => {
    it("无选区时 hasSelection 为 false", () => {
      const { result } = renderHook(() => useComments());
      expect(result.current.hasSelection).toBe(false);
    });

    it("有选区且 from !== to 时 hasSelection 为 true", () => {
      useDocumentStore.setState({
        selectionInfo: {
          text: "测试文本",
          from: 10,
          to: 20,
          paraId: "p1",
        },
      });

      const { result } = renderHook(() => useComments());
      expect(result.current.hasSelection).toBe(true);
    });

    it("有选区但 from === to 时 hasSelection 为 false", () => {
      useDocumentStore.setState({
        selectionInfo: {
          text: "测试文本",
          from: 10,
          to: 10,
          paraId: "p1",
        },
      });

      const { result } = renderHook(() => useComments());
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe("Agent API 集成", () => {
    it("editorBridge 有 Agent API 时调用 addComment", async () => {
      const mockAddComment = vi.fn().mockResolvedValue(undefined);
      useDocumentStore.setState({
        editorBridge: {
          getAgent: () => ({
            addComment: mockAddComment,
            replyToComment: vi.fn(),
            resolveComment: vi.fn(),
            deleteComment: vi.fn(),
          }),
        } as unknown as EditorBridge,
        selectionInfo: { from: 0, to: 5, text: "测试文本", paraId: "p1" },
      });

      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("测试批注");
      });

      expect(mockAddComment).toHaveBeenCalledWith("测试批注", {
        from: 0,
        to: 5,
      });
    });

    it("Agent API 失败时降级到本地状态", async () => {
      const mockAddComment = vi.fn().mockRejectedValue(new Error("API Error"));
      useDocumentStore.setState({
        editorBridge: {
          getAgent: () => ({
            addComment: mockAddComment,
            replyToComment: vi.fn(),
            resolveComment: vi.fn(),
            deleteComment: vi.fn(),
          }),
        } as unknown as EditorBridge,
        selectionInfo: { from: 0, to: 5, text: "测试文本", paraId: "p1" },
      });

      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.addComment("测试批注");
      });

      // 即使 API 失败，本地状态仍然更新
      expect(result.current.comments).toHaveLength(1);
    });

    it("editorBridge 无 Agent API 时使用本地状态", async () => {
      useDocumentStore.setState({
        editorBridge: {
          getAgent: () => null,
        } as unknown as EditorBridge,
        selectionInfo: { from: 0, to: 5, text: "测试文本", paraId: "p1" },
      });
      const { result } = renderHook(() => useComments());
      await act(async () => {
        await result.current.addComment("测试批注");
      });

      expect(result.current.comments).toHaveLength(1);
    });
  });
});
