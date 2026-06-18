// features/review/components/__tests__/comment-panel.test.tsx — CommentPanel 组件测试
// TDD: 验证批注面板渲染、添加批注、筛选、关闭交互
// Reference: .dev/requirements/requirements-functional.md F-122

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { useComments } from "../../hooks/use-comments";
import { CommentPanel } from "../comment-panel";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        "review.title": "批注",
        "review.empty": "暂无批注",
        "review.emptyHint": "选中文字后添加批注",
        "review.add": "添加批注",
        "review.addPlaceholder": "输入批注内容…",
        "review.reply": "回复",
        "review.replyPlaceholder": "输入回复…",
        "review.resolve": "解决",
        "review.resolved": "已解决",
        "review.delete": "删除",
        "review.deleteConfirm": "确定删除此批注？",
        "review.toggle": "批注面板",
        "review.author.anonymous": "匿名",
        "review.time.justNow": "刚刚",
        "review.time.minutesAgo": `${params?.count ?? 0} 分钟前`,
        "review.time.hoursAgo": `${params?.count ?? 0} 小时前`,
        "review.time.daysAgo": `${params?.count ?? 0} 天前`,
        "dialog.cancel": "取消",
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock useComments hook
vi.mock("../../hooks/use-comments", () => ({
  useComments: vi.fn(),
}));

// Regex patterns for button matching
const RESOLVED_REGEX = /已解决/;

describe("CommentPanel", () => {
  const mockAddComment = vi.fn();
  const mockReplyToComment = vi.fn();
  const mockResolveComment = vi.fn();
  const mockDeleteComment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ commentPanelOpen: true });

    // Default mock: no comments, no selection
    vi.mocked(useComments).mockReturnValue({
      comments: [],
      addComment: mockAddComment,
      replyToComment: mockReplyToComment,
      resolveComment: mockResolveComment,
      deleteComment: mockDeleteComment,
      hasSelection: false,
      commentCount: 0,
    });
  });

  describe("基础渲染", () => {
    it("渲染面板标题「批注」", () => {
      render(<CommentPanel />);
      expect(screen.getByText("批注")).toBeInTheDocument();
    });

    it("无批注时显示「暂无批注」", () => {
      render(<CommentPanel />);
      expect(screen.getByText("暂无批注")).toBeInTheDocument();
    });

    it("无选区时 textarea 显示提示「选中文字后添加批注」", () => {
      render(<CommentPanel />);
      expect(
        screen.getByPlaceholderText("选中文字后添加批注")
      ).toBeInTheDocument();
    });

    it("无选区时「添加批注」按钮禁用", () => {
      render(<CommentPanel />);
      const addBtn = screen.getByRole("button", { name: "添加批注" });
      expect(addBtn).toBeDisabled();
    });

    it("渲染关闭按钮", () => {
      render(<CommentPanel />);
      const closeBtn = screen.getByLabelText("批注面板");
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe("有选区时", () => {
    beforeEach(() => {
      vi.mocked(useComments).mockReturnValue({
        comments: [],
        addComment: mockAddComment,
        replyToComment: mockReplyToComment,
        resolveComment: mockResolveComment,
        deleteComment: mockDeleteComment,
        hasSelection: true,
        commentCount: 0,
      });
    });

    it("textarea 显示「输入批注内容…」占位符", () => {
      render(<CommentPanel />);
      expect(screen.getByPlaceholderText("输入批注内容…")).toBeInTheDocument();
    });

    it("textarea 可用", () => {
      render(<CommentPanel />);
      const textarea = screen.getByPlaceholderText("输入批注内容…");
      expect(textarea).not.toBeDisabled();
    });

    it("输入文本后「添加批注」按钮可用", async () => {
      const user = userEvent.setup();
      render(<CommentPanel />);

      const textarea = screen.getByPlaceholderText("输入批注内容…");
      await user.type(textarea, "新批注内容");

      const addBtn = screen.getByRole("button", { name: "添加批注" });
      expect(addBtn).not.toBeDisabled();
    });

    it("点击「添加批注」调用 addComment", async () => {
      mockAddComment.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<CommentPanel />);

      const textarea = screen.getByPlaceholderText("输入批注内容…");
      await user.type(textarea, "新批注内容");

      const addBtn = screen.getByRole("button", { name: "添加批注" });
      await user.click(addBtn);

      expect(mockAddComment).toHaveBeenCalledWith("新批注内容");
    });

    it("空文本时「添加批注」按钮禁用", () => {
      render(<CommentPanel />);
      const addBtn = screen.getByRole("button", { name: "添加批注" });
      expect(addBtn).toBeDisabled();
    });
  });

  describe("批注列表", () => {
    it("渲染批注列表", () => {
      vi.mocked(useComments).mockReturnValue({
        comments: [
          {
            id: "c1",
            author: "用户A",
            text: "批注内容1",
            createdAt: Date.now(),
            replies: [],
            resolved: false,
          },
          {
            id: "c2",
            author: "用户B",
            text: "批注内容2",
            createdAt: Date.now(),
            replies: [],
            resolved: false,
          },
        ],
        addComment: mockAddComment,
        replyToComment: mockReplyToComment,
        resolveComment: mockResolveComment,
        deleteComment: mockDeleteComment,
        hasSelection: false,
        commentCount: 2,
      });

      render(<CommentPanel />);

      expect(screen.getByText("批注内容1")).toBeInTheDocument();
      expect(screen.getByText("批注内容2")).toBeInTheDocument();
    });

    it("标题显示批注数量", () => {
      vi.mocked(useComments).mockReturnValue({
        comments: [
          {
            id: "c1",
            author: "用户A",
            text: "批注内容",
            createdAt: Date.now(),
            replies: [],
            resolved: false,
          },
        ],
        addComment: mockAddComment,
        replyToComment: mockReplyToComment,
        resolveComment: mockResolveComment,
        deleteComment: mockDeleteComment,
        hasSelection: false,
        commentCount: 1,
      });

      render(<CommentPanel />);
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("筛选功能", () => {
    it("默认只显示未解决批注", () => {
      vi.mocked(useComments).mockReturnValue({
        comments: [
          {
            id: "c1",
            author: "A",
            text: "未解决批注",
            createdAt: Date.now(),
            replies: [],
            resolved: false,
          },
          {
            id: "c2",
            author: "B",
            text: "已解决批注",
            createdAt: Date.now(),
            replies: [],
            resolved: true,
          },
        ],
        addComment: mockAddComment,
        replyToComment: mockReplyToComment,
        resolveComment: mockResolveComment,
        deleteComment: mockDeleteComment,
        hasSelection: false,
        commentCount: 1,
      });

      render(<CommentPanel />);

      expect(screen.getByText("未解决批注")).toBeInTheDocument();
      expect(screen.queryByText("已解决批注")).not.toBeInTheDocument();
    });

    it("点击「已解决」显示已解决批注", async () => {
      vi.mocked(useComments).mockReturnValue({
        comments: [
          {
            id: "c1",
            author: "A",
            text: "未解决批注",
            createdAt: Date.now(),
            replies: [],
            resolved: false,
          },
          {
            id: "c2",
            author: "B",
            text: "已解决批注",
            createdAt: Date.now(),
            replies: [],
            resolved: true,
          },
        ],
        addComment: mockAddComment,
        replyToComment: mockReplyToComment,
        resolveComment: mockResolveComment,
        deleteComment: mockDeleteComment,
        hasSelection: false,
        commentCount: 1,
      });

      const user = userEvent.setup();
      render(<CommentPanel />);

      const resolvedBtn = screen.getByRole("button", { name: RESOLVED_REGEX });
      await user.click(resolvedBtn);

      expect(screen.getByText("已解决批注")).toBeInTheDocument();
      expect(screen.getByText("未解决批注")).toBeInTheDocument();
    });
  });

  describe("embedded 模式", () => {
    it("embedded=true 时不渲染标题栏和关闭按钮", () => {
      render(<CommentPanel embedded />);

      expect(screen.queryByLabelText("批注面板")).toBeNull();
      expect(screen.queryByText("批注")).toBeNull();
    });

    it("embedded=true 时仍然渲染添加批注区和批注列表", () => {
      render(<CommentPanel embedded />);
      // embedded 模式下，无选区时 placeholder 应为 emptyHint
      expect(
        screen.getByPlaceholderText("选中文字后添加批注")
      ).toBeInTheDocument();
    });

    it("embedded=false 时渲染标题栏和关闭按钮", () => {
      render(<CommentPanel embedded={false} />);

      expect(screen.getByLabelText("批注面板")).toBeInTheDocument();
      expect(screen.getByText("批注")).toBeInTheDocument();
    });

    it("默认 embedded=false", () => {
      render(<CommentPanel />);

      expect(screen.getByLabelText("批注面板")).toBeInTheDocument();
    });
  });
});
