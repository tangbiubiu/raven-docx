// features/review/components/__tests__/comment-card.test.tsx — CommentCard 组件测试
// TDD: 验证批注卡片渲染、交互、时间格式化
// Reference: .dev/requirements/requirements-functional.md F-120

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Comment } from "../../hooks/use-comments";
import { CommentCard } from "../comment-card";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        "review.author.anonymous": "匿名",
        "review.resolved": "已解决",
        "review.reply": "回复",
        "review.resolve": "解决",
        "review.delete": "删除",
        "review.deleteConfirm": "确定删除此批注？",
        "review.replyPlaceholder": "输入回复…",
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

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "cmt_1",
  author: "测试用户",
  text: "这是一条测试批注",
  createdAt: Date.now(),
  replies: [],
  resolved: false,
  ...overrides,
});

describe("CommentCard", () => {
  const defaultProps = {
    comment: makeComment(),
    onReply: vi.fn(),
    onResolve: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基础渲染", () => {
    it("渲染作者名", () => {
      render(<CommentCard {...defaultProps} />);
      expect(screen.getByText("测试用户")).toBeInTheDocument();
    });

    it("渲染批注正文", () => {
      render(<CommentCard {...defaultProps} />);
      expect(screen.getByText("这是一条测试批注")).toBeInTheDocument();
    });

    it("渲染「刚刚」时间标签", () => {
      const comment = makeComment({ createdAt: Date.now() });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByText("刚刚")).toBeInTheDocument();
    });

    it("渲染几分钟前的时间", () => {
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const comment = makeComment({ createdAt: fiveMinAgo });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByText("5 分钟前")).toBeInTheDocument();
    });

    it("渲染几小时前的时间", () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const comment = makeComment({ createdAt: twoHoursAgo });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByText("2 小时前")).toBeInTheDocument();
    });

    it("渲染几天前的时间", () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const comment = makeComment({ createdAt: threeDaysAgo });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByText("3 天前")).toBeInTheDocument();
    });

    it("空作者显示「匿名」", () => {
      const comment = makeComment({ author: "" });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByText("匿名")).toBeInTheDocument();
    });
  });

  describe("已解决状态", () => {
    it("已解决批注显示「已解决」标签", () => {
      const comment = makeComment({ resolved: true });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByText("已解决")).toBeInTheDocument();
    });

    it("未解决批注不显示「已解决」标签", () => {
      const comment = makeComment({ resolved: false });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.queryByText("已解决")).not.toBeInTheDocument();
    });

    it("已解决批注不显示「回复」和「解决」按钮", () => {
      const comment = makeComment({ resolved: true });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(
        screen.queryByRole("button", { name: "回复" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "解决" })
      ).not.toBeInTheDocument();
    });

    it("未解决批注显示「回复」和「解决」按钮", () => {
      const comment = makeComment({ resolved: false });
      render(<CommentCard {...defaultProps} comment={comment} />);
      expect(screen.getByRole("button", { name: "回复" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "解决" })).toBeInTheDocument();
    });
  });

  describe("回复功能", () => {
    it("点击「回复」按钮显示回复输入框", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const replyBtn = screen.getByRole("button", { name: "回复" });
      await user.click(replyBtn);

      expect(screen.getByPlaceholderText("输入回复…")).toBeInTheDocument();
    });

    it("回复输入框支持输入文本", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const replyBtn = screen.getByRole("button", { name: "回复" });
      await user.click(replyBtn);

      const textarea = screen.getByPlaceholderText("输入回复…");
      await user.type(textarea, "这是回复内容");

      expect(textarea).toHaveValue("这是回复内容");
    });

    it("点击「取消」关闭回复输入框", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const replyBtn = screen.getByRole("button", { name: "回复" });
      await user.click(replyBtn);

      const cancelBtn = screen.getByRole("button", { name: "取消" });
      await user.click(cancelBtn);

      expect(
        screen.queryByPlaceholderText("输入回复…")
      ).not.toBeInTheDocument();
    });

    it("点击「回复」提交按钮调用 onReply", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const replyBtn = screen.getByRole("button", { name: "回复" });
      await user.click(replyBtn);

      const textarea = screen.getByPlaceholderText("输入回复…");
      await user.type(textarea, "回复内容");

      const submitBtn = screen.getByRole("button", { name: "回复" });
      await user.click(submitBtn);

      expect(defaultProps.onReply).toHaveBeenCalledWith("cmt_1", "回复内容");
    });

    it("空回复文本时提交按钮禁用", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const replyBtn = screen.getByRole("button", { name: "回复" });
      await user.click(replyBtn);

      const submitBtn = screen.getByRole("button", { name: "回复" });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe("解决功能", () => {
    it("点击「解决」按钮调用 onResolve", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const resolveBtn = screen.getByRole("button", { name: "解决" });
      await user.click(resolveBtn);

      expect(defaultProps.onResolve).toHaveBeenCalledWith("cmt_1");
    });
  });

  describe("删除功能", () => {
    it("点击「删除」按钮调用 onDelete", async () => {
      const user = userEvent.setup();
      render(<CommentCard {...defaultProps} />);

      const deleteBtn = screen.getByRole("button", { name: "删除" });
      await user.click(deleteBtn);

      expect(defaultProps.onDelete).toHaveBeenCalledWith("cmt_1");
    });
  });

  describe("回复列表", () => {
    it("渲染回复列表", () => {
      const comment = makeComment({
        replies: [
          {
            id: "r1",
            author: "回复者",
            text: "这是回复内容",
            createdAt: Date.now(),
          },
        ],
      });
      render(<CommentCard {...defaultProps} comment={comment} />);

      expect(screen.getByText("回复者")).toBeInTheDocument();
      expect(screen.getByText("这是回复内容")).toBeInTheDocument();
    });

    it("多条回复按顺序渲染", () => {
      const comment = makeComment({
        replies: [
          { id: "r1", author: "A", text: "回复1", createdAt: Date.now() },
          { id: "r2", author: "B", text: "回复2", createdAt: Date.now() },
        ],
      });
      render(<CommentCard {...defaultProps} comment={comment} />);

      expect(screen.getByText("回复1")).toBeInTheDocument();
      expect(screen.getByText("回复2")).toBeInTheDocument();
    });

    it("空回复时不渲染回复区域", () => {
      const comment = makeComment({ replies: [] });
      const { container } = render(
        <CommentCard {...defaultProps} comment={comment} />
      );

      // 回复区域有 border-l-2 样式
      const replySection = container.querySelector(".border-l-2");
      expect(replySection).not.toBeInTheDocument();
    });
  });
});
