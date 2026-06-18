// QuickActions.tsx — 快捷操作按钮组 (Quick Action Buttons)
// 工具栏下方的 4 个快捷 Agent 动作：润色、扩写、摘要、翻译
// Reference: .dev/plan/phase3-branch-plan.md §3.8

import { useT } from "@/lib/i18n";
import { useAgentContext } from "../hooks/useAgentContext";
import { useAgentSession } from "../hooks/useAgentSession";

const QUICK_ACTION_IDS = [
  "continueWriting",
  "rewrite",
  "summarize",
  "expand",
  "translate",
  "styleCheck",
  "makeFormal",
  "explain",
] as const;

export function QuickActions() {
  const { t } = useT();
  const { send, isStreaming } = useAgentSession();
  const { getSelectionContext, buildPrompt } = useAgentContext();

  const handleClick = async (actionId: string) => {
    const ctx = getSelectionContext();
    if (!ctx) {
      return;
    }
    const prompt = buildPrompt(actionId, ctx);
    // 快捷操作使用 steer 模式：如果 Agent 正在处理任务，中断并执行新操作
    // 不使用 enqueue，因为快捷操作期望立即响应，排队模式需要额外的队列状态管理
    await send(prompt, isStreaming ? "steer" : "default");
  };

  return (
    <div className="flex gap-1 px-2 py-1">
      {QUICK_ACTION_IDS.map((id) => (
        <button
          className="rounded px-2 py-1 text-xs transition-colors hover:bg-accent"
          key={id}
          onClick={() => handleClick(id)}
          type="button"
        >
          {t(`agent.action.${id}`)}
        </button>
      ))}
    </div>
  );
}
