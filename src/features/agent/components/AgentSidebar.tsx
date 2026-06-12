// AgentSidebar — 右侧 Agent 对话侧栏 (Agent Conversation Sidebar)
// Phase 1: 占位壳，仅展示布局结构和状态提示
// 完整 Agent 交互在 Phase 3 实现
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.8

import { useAppStore } from "@/stores/useAppStore";
import { useAgentStore } from "@/stores/useAgentStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AgentSidebar() {
  const { t } = useT();
  const open = useAppStore((s) => s.agentSidebarOpen);
  const toggle = useAppStore((s) => s.toggleAgentSidebar);
  const agentStatus = useAgentStore((s) => s.status);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex w-8 shrink-0 items-center justify-center border-border border-l bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label={t("agent.title")}
        title={t("agent.title")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "flex w-[380px] shrink-0 flex-col border-border border-l bg-background"
      )}
      aria-label={t("agent.title")}
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
          type="button"
          onClick={toggle}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={t("agent.title")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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