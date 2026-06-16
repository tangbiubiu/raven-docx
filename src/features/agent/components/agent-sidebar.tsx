// AgentSidebar — 右侧 Agent 对话侧栏 (Agent Conversation Sidebar)
// 完整的 Agent 交互界面：消息列表、流式渲染、输入框、错误状态
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.8

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/stores/useAgentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useAgentSession } from "../hooks/useAgentSession";

export function AgentSidebar() {
  const { t } = useT();
  const open = useAppStore((s) => s.agentSidebarOpen);
  const toggle = useAppStore((s) => s.toggleAgentSidebar);
  const documentPath = useDocumentStore((s) => s.documentPath);

  const {
    status,
    error,
    messages,
    isStreaming,
    send,
    abort,
    retry,
    clear,
    contextBadge,
  } = useAgentSession();

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;
    const prompt = inputValue.trim();
    setInputValue("");
    try {
      await send(prompt);
    } catch {
      // 错误已通过 store 处理
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 未打开侧边栏时显示折叠按钮
  if (!open) {
    return (
      <button
        aria-label={t("agent.title")}
        className="flex w-8 shrink-0 items-center justify-center border-border border-l bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={toggle}
        title={t("agent.title")}
        type="button"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </button>
    );
  }

  // 无文档打开时的自由模式
  const isFreeMode = !documentPath;

  return (
    <aside
      aria-label={t("agent.title")}
      className={cn(
        "flex w-[380px] shrink-0 flex-col border-border border-l bg-background"
      )}
    >
      {/* Agent 标题栏 */}
      <div className="flex items-center justify-between border-border border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{t("agent.title")}</span>
          <StatusIndicator status={status} />
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={clear}
              title={t("dialog.clear") || "清空"}
              type="button"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          )}
          <button
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={toggle}
            title={t("dialog.close")}
            type="button"
          >
            <svg
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
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground">
            <div>
              <svg
                className="mx-auto mb-3 h-12 w-12 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <p className="text-sm">
                {t("agent.welcome") || "有什么我可以帮你的？"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-3 mb-2 rounded border border-destructive bg-destructive/10 p-2 text-destructive text-sm">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span className="flex-1">{error}</span>
            <button
              className="text-destructive hover:text-destructive/80"
              onClick={retry}
              title={t("dialog.retry") || "重试"}
              type="button"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-border border-t p-3">
        {/* 上下文徽章 */}
        {contextBadge && (
          <div className="mb-2 flex items-center gap-1 text-muted-foreground text-xs">
            <span className="rounded bg-accent px-2 py-0.5">
              {contextBadge.text}
            </span>
          </div>
        )}

        {/* 自由模式提示 */}
        {isFreeMode && (
          <div className="mb-2 rounded bg-accent/50 px-2 py-1 text-muted-foreground text-xs">
            {t("agent.freeMode") || "打开文档以启用完整 Agent 功能"}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            className={cn(
              "flex-1 resize-none rounded border border-input bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            disabled={isFreeMode && status === "error"}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("agent.input.placeholder")}
            ref={textareaRef}
            rows={1}
            value={inputValue}
          />
          {isStreaming ? (
            <button
              className="rounded bg-destructive px-3 py-2 font-medium text-destructive-foreground text-sm hover:bg-destructive/90"
              onClick={abort}
              title={t("agent.input.stop")}
              type="button"
            >
              {t("agent.input.stop")}
            </button>
          ) : (
            <button
              className={cn(
                "rounded bg-primary px-3 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              disabled={
                !inputValue.trim() || (isFreeMode && status === "error")
              }
              onClick={handleSend}
              title={t("agent.input.send")}
              type="button"
            >
              {t("agent.input.send")}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

/** 状态指示器 */
function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    disconnected: "bg-gray-400",
    connecting: "bg-yellow-400 animate-pulse",
    ready: "bg-green-400",
    busy: "bg-blue-400 animate-pulse",
    error: "bg-red-400",
  };

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        colors[status] || "bg-gray-400"
      )}
      title={status}
    />
  );
}

/** 消息气泡 */
function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
          )}
        </div>
      </div>
    </div>
  );
}
