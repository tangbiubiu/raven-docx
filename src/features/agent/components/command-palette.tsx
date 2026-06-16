// CommandPalette.tsx — 命令面板 (Command Palette)
// Cmd/Ctrl+K 唤起的全局命令面板，支持预设动作和自定义指令
// Reference: .dev/plan/phase3-branch-plan.md §3.5, §3.6, §3.7

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useAgentContext } from "../hooks/useAgentContext";
import { useAgentSession } from "../hooks/useAgentSession";

/**
 * 预设动作定义
 */
type PresetAction = {
  id: string;
  labelKey: string;
  icon: string;
  requiresSelection: boolean;
  requiresDocument: boolean;
};

const PRESET_ACTIONS: PresetAction[] = [
  {
    id: "rewrite",
    labelKey: "agent.action.rewrite",
    icon: "✨",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "expand",
    labelKey: "agent.action.expand",
    icon: "📝",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "summarize",
    labelKey: "agent.action.summarize",
    icon: "📋",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "translate",
    labelKey: "agent.action.translate",
    icon: "🌐",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "explain",
    labelKey: "agent.action.explain",
    icon: "💡",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "fixGrammar",
    labelKey: "agent.action.fixGrammar",
    icon: "✓",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "makeFormal",
    labelKey: "agent.action.makeFormal",
    icon: "👔",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "makeCasual",
    labelKey: "agent.action.makeCasual",
    icon: "😊",
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    id: "proofread",
    labelKey: "agent.action.proofread",
    icon: "📄",
    requiresSelection: false,
    requiresDocument: true,
  },
  {
    id: "continue",
    labelKey: "agent.action.continueWriting",
    icon: "▶",
    requiresSelection: false,
    requiresDocument: true,
  },
  {
    id: "optimizeLayout",
    labelKey: "agent.action.formatDoc",
    icon: "📊",
    requiresSelection: false,
    requiresDocument: true,
  },
  {
    id: "custom",
    labelKey: "agent.action.custom",
    icon: "🎤",
    requiresSelection: false,
    requiresDocument: false,
  },
];

export function CommandPalette() {
  const { t } = useT();
  const closeModal = useAppStore((s) => s.closeModal);
  const documentPath = useDocumentStore((s) => s.documentPath);

  const { send } = useAgentSession();
  const { getSelectionContext, buildPrompt } = useAgentContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 过滤动作列表
  const filteredActions = PRESET_ACTIONS.filter((action) => {
    const label = t(action.labelKey).toLowerCase();
    return label.includes(searchQuery.toLowerCase());
  });

  // 自动聚焦搜索框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 重置高亮项
  useEffect(() => {
    setHighlightedIndex(0);
  }, []);

  // 确保高亮项可见
  useEffect(() => {
    const highlighted = listRef.current?.children[highlightedIndex] as
      | HTMLElement
      | undefined;
    if (highlighted?.scrollIntoView) {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredActions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = filteredActions[highlightedIndex];
      if (action) {
        executeAction(action);
      } else if (searchQuery.trim()) {
        // 自定义指令
        executeCustom(searchQuery);
      }
    }
  };

  const executeAction = async (action: PresetAction) => {
    if (action.requiresDocument && !documentPath) {
      return;
    }
    const ctx = getSelectionContext();
    if (action.requiresSelection && !ctx) {
      return;
    }

    closeModal();
    const prompt = buildPrompt(action.id, ctx);
    await send(prompt);
  };

  const executeCustom = async (customPrompt: string) => {
    const ctx = getSelectionContext();
    closeModal();
    const prompt = buildPrompt("custom", ctx, customPrompt);
    await send(prompt);
  };

  const isActionDisabled = (action: PresetAction): boolean => {
    if (action.requiresDocument && !documentPath) {
      return true;
    }
    if (action.requiresSelection && !getSelectionContext()) {
      return true;
    }
    return false;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close is standard UX
    <div
      aria-label={t("agent.cmdPalette.backdrop")}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          closeModal();
        }
      }}
      role="presentation"
      tabIndex={-1}
    >
      <div
        aria-modal="true"
        className="w-[560px] rounded-lg bg-background shadow-xl"
        role="dialog"
      >
        {/* 搜索框 */}
        <div className="border-b p-3">
          <input
            className="w-full rounded border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("agent.cmdPalette.placeholder")}
            ref={inputRef}
            type="text"
            value={searchQuery}
          />
        </div>

        {/* 动作列表 */}
        <div className="max-h-[400px] overflow-y-auto p-2" ref={listRef}>
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("agent.cmdPalette.empty")}
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const disabled = isActionDisabled(action);
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors",
                    index === highlightedIndex && "bg-accent",
                    disabled ? "cursor-not-allowed opacity-50" : ""
                  )}
                  disabled={disabled}
                  key={action.id}
                  onClick={() => executeAction(action)}
                  type="button"
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="flex-1">{t(action.labelKey)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
