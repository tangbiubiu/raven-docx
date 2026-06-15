// AgentSidebar — 右侧 Agent 对话侧栏 (Agent Conversation Sidebar)
// Phase 1: 占位壳，仅展示布局结构和状态提示
// 完整 Agent 交互在 Phase 3 实现
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.8

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/useAgentStore";
import { useAppStore } from "@/stores/useAppStore";

export function AgentSidebar() {
  const { t } = useT();
  const open = useAppStore((s) => s.agentSidebarOpen);
  const toggle = useAppStore((s) => s.toggleAgentSidebar);
  const agentStatus = useAgentStore((s) => s.status);

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
          fill="none"
          height="16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

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
          <span className="font-medium text-muted-foreground text-xs">
            {t("agent.title")}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
            {agentStatus === "disconnected" || agentStatus === "error"
              ? t("agent.status.disconnected")
              : t("agent.status.idle")}
          </span>
        </div>
        <button
          aria-label={t("agent.title")}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={toggle}
          type="button"
        >
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Phase 1: 占位消息区域 */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <p className="mb-2 text-muted-foreground text-sm">
            {t("agent.status.idle")}
          </p>
          <p className="text-muted-foreground/70 text-xs">
            {t("agent.status.noConfig")}
          </p>
        </div>
      </div>

      {/* 输入区域占位 */}
      <div className="border-border border-t p-3">
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
          <span className="text-muted-foreground/50 text-xs">
            {t("agent.input.placeholder")}
          </span>
        </div>
      </div>
    </aside>
  );
}
