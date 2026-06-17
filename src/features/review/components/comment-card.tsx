// features/review/components/comment-card.tsx — 单条批注卡片 (Single Comment Card)
// 显示作者、时间、正文、回复列表，提供回复/解决/删除操作
// Reference: .dev/requirements/requirements-functional.md F-120

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Comment, CommentReply } from "../hooks/use-comments";

/** 相对时间格式化（几分钟/小时/天前） */
function formatRelativeTime(
  timestamp: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return t("review.time.justNow");
  }
  if (minutes < 60) {
    return t("review.time.minutesAgo", { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t("review.time.hoursAgo", { count: hours });
  }
  const days = Math.floor(hours / 24);
  return t("review.time.daysAgo", { count: days });
}

export type CommentCardProps = {
  comment: Comment;
  onReply: (commentId: string, text: string) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
};

export function CommentCard({
  comment,
  onReply,
  onResolve,
  onDelete,
}: CommentCardProps) {
  const { t } = useT();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      return;
    }
    await onReply(comment.id, replyText);
    setReplyText("");
    setReplyOpen(false);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleReplySubmit();
    }
  };

  return (
    <article
      className={cn(
        "rounded-md border border-border bg-card p-3",
        comment.resolved ? "opacity-60" : ""
      )}
    >
      {/* 头部：作者 + 时间 */}
      <header className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
            {comment.author || t("review.author.anonymous")}
          </span>
          {comment.resolved ? (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
              {t("review.resolved")}
            </span>
          ) : null}
        </div>
        <time className="text-muted-foreground text-xs">
          {formatRelativeTime(comment.createdAt, t)}
        </time>
      </header>

      {/* 正文 */}
      <p className="mb-2 whitespace-pre-wrap text-sm">{comment.text}</p>

      {/* 回复列表 */}
      {comment.replies.length > 0 && (
        <div className="mb-2 space-y-2 border-border border-l-2 pl-3">
          {comment.replies.map((reply: CommentReply) => (
            <div key={reply.id}>
              <div className="mb-0.5 flex items-center gap-2">
                <span className="font-medium text-xs">
                  {reply.author || t("review.author.anonymous")}
                </span>
                <time className="text-muted-foreground text-xs">
                  {formatRelativeTime(reply.createdAt, t)}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-xs">{reply.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* 回复输入区 */}
      {replyOpen ? (
        <div className="mb-2">
          <textarea
            className="w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleReplyKeyDown}
            placeholder={t("review.replyPlaceholder")}
            rows={2}
            value={replyText}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              className="rounded px-2 py-0.5 text-muted-foreground text-xs hover:bg-accent"
              onClick={() => {
                setReplyOpen(false);
                setReplyText("");
              }}
              type="button"
            >
              {t("dialog.cancel")}
            </button>
            <button
              className="rounded bg-primary px-2 py-0.5 text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50"
              disabled={!replyText.trim()}
              onClick={() => {
                handleReplySubmit();
              }}
              type="button"
            >
              {t("review.reply")}
            </button>
          </div>
        </div>
      ) : null}

      {/* 操作栏 */}
      <footer className="flex items-center gap-2 border-border border-t pt-1.5">
        {!comment.resolved && (
          <>
            {!replyOpen && (
              <button
                className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-accent"
                onClick={() => setReplyOpen(true)}
                type="button"
              >
                {t("review.reply")}
              </button>
            )}
            <button
              className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-accent"
              onClick={() => {
                onResolve(comment.id);
              }}
              type="button"
            >
              {t("review.resolve")}
            </button>
          </>
        )}
        <button
          className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-accent hover:text-destructive"
          onClick={() => {
            onDelete(comment.id);
          }}
          type="button"
        >
          {t("review.delete")}
        </button>
      </footer>
    </article>
  );
}
