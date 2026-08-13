// QuickActions.tsx — 快捷操作按钮组 (Quick Action Buttons)
// Agent 侧边栏中的 8 个快捷操作：续写、润色、摘要、扩写、翻译、风格检查、转正式、解释
// Reference: .dev/proto/workspace.html (agent sidebar section)

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  ClipboardList,
  Expand,
  Languages,
  Lightbulb,
  PenLine,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAgentContext } from "../hooks/useAgentContext";
import { useAgentSession } from "../hooks/useAgentSession";

type QuickAction = {
  id: string;
  icon: LucideIcon;
  shortcut?: string;
  labelKey: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "continue",
    icon: PenLine,
    shortcut: "⌘J",
    labelKey: "agent.action.continueWriting",
  },
  {
    id: "rewrite",
    icon: Sparkles,
    shortcut: "⌘K",
    labelKey: "agent.action.rewrite",
  },
  {
    id: "summarize",
    icon: ClipboardList,
    shortcut: "⌘⇧S",
    labelKey: "agent.action.summarize",
  },
  { id: "expand", icon: Expand, labelKey: "agent.action.expand" },
  { id: "translate", icon: Languages, labelKey: "agent.action.translate" },
  { id: "styleCheck", icon: SearchCheck, labelKey: "agent.action.styleCheck" },
  { id: "makeFormal", icon: Briefcase, labelKey: "agent.action.makeFormal" },
  { id: "explain", icon: Lightbulb, labelKey: "agent.action.explain" },
];

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
    await send(prompt, isStreaming ? "steer" : "default");
  };

  return (
    <div className="grid grid-cols-2 gap-1 px-2 py-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors hover:bg-accent"
          key={action.id}
          onClick={() => handleClick(action.id)}
          type="button"
        >
          <action.icon className="size-4" />
          <span className="flex-1 text-left">{t(action.labelKey)}</span>
          {!!action.shortcut && (
            <span className="text-[10px] text-muted-foreground">
              {action.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
