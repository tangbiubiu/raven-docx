// AgentSidebar — 右侧 Agent 对话侧栏 (Agent Conversation Sidebar)
// 完整的 Agent 交互界面：消息列表、流式渲染、输入框、错误状态
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.8

import {
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommentPanel } from "@/features/review/components/comment-panel";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/stores/useAgentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useAgentSession } from "../hooks/useAgentSession";
import { QuickActions } from "./quick-actions";

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
  const [activeTab, setActiveTab] = useState<"chat" | "comments">("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部 - 依赖 messages 长度触发
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) {
      return;
    }
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
        <MessageCircle className="h-4 w-4" />
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
      {/* Agent 标题栏 — 包含 Tab 切换 */}
      <div className="flex items-center gap-2 border-border border-b px-3 py-2">
        <span className="font-medium text-sm">{t("agent.title")}</span>
        <StatusIndicator status={status} />

        {/* Tab 切换 — 对齐原型 .agent-tabs */}
        <div className="ml-auto flex gap-0.5">
          <button
            className={cn(
              "rounded px-2 py-0.5 text-[11px] transition-colors",
              activeTab === "chat"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => setActiveTab("chat")}
            type="button"
          >
            {t("agent.tab.chat")}
          </button>
          <button
            className={cn(
              "rounded px-2 py-0.5 text-[11px] transition-colors",
              activeTab === "comments"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => setActiveTab("comments")}
            type="button"
          >
            {t("agent.tab.comments")}
          </button>
        </div>

        {/* 上下文徽章 — 对齐原型 .agent-context-badge */}
        {contextBadge !== null && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
            {contextBadge.text}
          </span>
        )}

        {/* 清空 + 关闭按钮 */}
        <div className="flex items-center gap-1">
          {activeTab === "chat" && messages.length > 0 && (
            <button
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={clear}
              title={t("dialog.clear") || "清空"}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={toggle}
            title={t("dialog.close")}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 根据 activeTab 切换内容区域 */}
      {activeTab === "chat" ? (
        <>
          {/* 消息列表 */}
          <div className="flex-1 space-y-4 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
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
          {error ? (
            <div className="mx-3 mb-2 rounded border border-destructive bg-destructive/10 p-2 text-destructive text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  className="text-destructive hover:text-destructive/80"
                  onClick={retry}
                  title={t("dialog.retry") || "重试"}
                  type="button"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {/* QuickActions — 位于消息列表和输入框之间 */}
          <QuickActions />

          {/* 输入区域 */}
          <div className="border-border border-t p-3">
            {/* 自由模式提示 */}
            {isFreeMode ? (
              <div className="mb-2 rounded bg-accent/50 px-2 py-1 text-muted-foreground text-xs">
                {t("agent.freeMode") || "打开文档以启用完整 Agent 功能"}
              </div>
            ) : null}

            <div className="flex gap-2">
              <textarea
                className={cn(
                  "flex-1 resize-none rounded border border-input bg-background px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                disabled={isFreeMode || status === "error"}
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
                    !inputValue.trim() || isFreeMode || status === "error"
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
        </>
      ) : (
        /* 批注 Tab — 内嵌 CommentPanel */
        <CommentPanel embedded />
      )}
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
          {message.isStreaming ? (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
