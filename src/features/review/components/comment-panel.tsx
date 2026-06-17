// features/review/components/comment-panel.tsx — 右侧批注面板 (Right Comment Panel)
// 显示文档批注列表，支持添加新批注、筛选已解决/未解决
// Reference: .dev/requirements/requirements-functional.md F-122

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useComments } from "../hooks/use-comments";
import { CommentCard } from "./comment-card";

export function CommentPanel() {
  const { t } = useT();
  const togglePanel = useAppStore((s) => s.toggleCommentPanel);

  const {
    comments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    hasSelection,
    commentCount,
  } = useComments();

  const [newCommentText, setNewCommentText] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const handleAddComment = async () => {
    if (!newCommentText.trim()) {
      return;
    }
    await addComment(newCommentText);
    setNewCommentText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  return (
    <aside
      className={cn(
        "flex h-full w-80 flex-col border-border border-l bg-background",
        "transition-all duration-200"
      )}
    >
      {/* 标题栏 */}
      <header className="flex items-center justify-between border-border border-b px-4 py-3">
        <h2 className="font-semibold text-base">
          {t("review.title")}
          {commentCount > 0 ? (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
              {commentCount}
            </span>
          ) : null}
        </h2>
        <button
          aria-label={t("review.toggle")}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
          onClick={togglePanel}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </header>

      {/* 添加批注区 */}
      <div className="border-border border-b p-3">
        <textarea
          className="mb-2 w-full resize-none rounded border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelection}
          onChange={(e) => setNewCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasSelection ? t("review.addPlaceholder") : t("review.emptyHint")
          }
          rows={3}
          value={newCommentText}
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {hasSelection ? null : t("review.emptyHint")}
          </span>
          <button
            className="rounded bg-primary px-3 py-1 text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasSelection || newCommentText.trim().length === 0}
            onClick={() => {
              handleAddComment();
            }}
            type="button"
          >
            {t("review.add")}
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-2 border-border border-b px-3 py-2">
        <button
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            showResolved
              ? "text-muted-foreground hover:bg-accent"
              : "bg-primary text-primary-foreground"
          )}
          onClick={() => setShowResolved(false)}
          type="button"
        >
          {t("review.title")} ({commentCount})
        </button>
        <button
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            showResolved
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => setShowResolved(true)}
          type="button"
        >
          {t("review.resolved")} ({comments.length - commentCount})
        </button>
      </div>

      {/* 批注列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredComments.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-muted-foreground text-sm">
              {t("review.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComments.map((comment) => (
              <CommentCard
                comment={comment}
                key={comment.id}
                onDelete={deleteComment}
                onReply={replyToComment}
                onResolve={resolveComment}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
