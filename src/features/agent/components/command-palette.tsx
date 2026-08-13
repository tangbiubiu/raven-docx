// CommandPalette.tsx — 命令面板 (Command Palette)
// Cmd/Ctrl+K 唤起的全局命令面板，支持预设动作、Ribbon 命令和自定义指令
// Reference: .dev/plan/phase3-branch-plan.md §3.5, §3.6, §3.7, §3.9

import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Briefcase,
  CheckCheck,
  ClipboardList,
  Expand,
  FileCheck,
  Indent,
  Italic,
  Languages,
  LayoutDashboard,
  Lightbulb,
  List,
  ListOrdered,
  Mic,
  Outdent,
  PenLine,
  Smile,
  Sparkles,
  Strikethrough,
  Table,
  Underline,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  execIndent,
  execInsertTable,
  execOutdent,
  execSetAlignment,
  execToggleMark,
  execWrapIn,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useAgentContext } from "../hooks/useAgentContext";
import { useAgentSession } from "../hooks/useAgentSession";

/**
 * 命令面板动作(联合类型)/ Command palette action (union)
 * - agent: 发送给 LLM 的预设动作(润色/扩写/翻译…)
 * - command: 直接执行的 Ribbon 命令(加粗/插入表格…)不调 agent
 */
type PaletteAction =
  | {
      kind: "agent";
      id: string;
      labelKey: string;
      icon: LucideIcon;
      requiresSelection: boolean;
      requiresDocument: boolean;
    }
  | {
      kind: "command";
      id: string;
      labelKey: string;
      icon: LucideIcon;
      execute: () => void;
    };

/** Agent 预设动作 / Agent preset actions */
const AGENT_ACTIONS: PaletteAction[] = [
  {
    kind: "agent",
    id: "rewrite",
    labelKey: "agent.action.rewrite",
    icon: Sparkles,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "expand",
    labelKey: "agent.action.expand",
    icon: Expand,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "summarize",
    labelKey: "agent.action.summarize",
    icon: ClipboardList,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "translate",
    labelKey: "agent.action.translate",
    icon: Languages,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "explain",
    labelKey: "agent.action.explain",
    icon: Lightbulb,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "fixGrammar",
    labelKey: "agent.action.fixGrammar",
    icon: CheckCheck,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "makeFormal",
    labelKey: "agent.action.makeFormal",
    icon: Briefcase,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "makeCasual",
    labelKey: "agent.action.makeCasual",
    icon: Smile,
    requiresSelection: true,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "proofread",
    labelKey: "agent.action.proofread",
    icon: FileCheck,
    requiresSelection: false,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "continue",
    labelKey: "agent.action.continueWriting",
    icon: PenLine,
    requiresSelection: false,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "optimizeLayout",
    labelKey: "agent.action.formatDoc",
    icon: LayoutDashboard,
    requiresSelection: false,
    requiresDocument: true,
  },
  {
    kind: "agent",
    id: "custom",
    labelKey: "agent.action.custom",
    icon: Mic,
    requiresSelection: false,
    requiresDocument: false,
  },
];

/** Ribbon 命令(直接执行,不发 agent)/ Ribbon commands (direct execution) */
const RIBBON_COMMANDS: PaletteAction[] = [
  {
    kind: "command",
    id: "cmd-bold",
    labelKey: "format.bold",
    icon: Bold,
    execute: () => execToggleMark("bold"),
  },
  {
    kind: "command",
    id: "cmd-italic",
    labelKey: "format.italic",
    icon: Italic,
    execute: () => execToggleMark("italic"),
  },
  {
    kind: "command",
    id: "cmd-underline",
    labelKey: "format.underline",
    icon: Underline,
    execute: () => execToggleMark("underline"),
  },
  {
    kind: "command",
    id: "cmd-strike",
    labelKey: "format.strikethrough",
    icon: Strikethrough,
    execute: () => execToggleMark("strike"),
  },
  {
    kind: "command",
    id: "cmd-alignLeft",
    labelKey: "format.alignLeft",
    icon: AlignLeft,
    execute: () => execSetAlignment("left"),
  },
  {
    kind: "command",
    id: "cmd-alignCenter",
    labelKey: "format.alignCenter",
    icon: AlignCenter,
    execute: () => execSetAlignment("center"),
  },
  {
    kind: "command",
    id: "cmd-alignRight",
    labelKey: "format.alignRight",
    icon: AlignRight,
    execute: () => execSetAlignment("right"),
  },
  {
    kind: "command",
    id: "cmd-alignJustify",
    labelKey: "format.alignJustify",
    icon: AlignJustify,
    execute: () => execSetAlignment("justify"),
  },
  {
    kind: "command",
    id: "cmd-orderedList",
    labelKey: "format.orderedList",
    icon: ListOrdered,
    execute: () => execWrapIn("ordered_list"),
  },
  {
    kind: "command",
    id: "cmd-unorderedList",
    labelKey: "format.unorderedList",
    icon: List,
    execute: () => execWrapIn("bullet_list"),
  },
  {
    kind: "command",
    id: "cmd-indent",
    labelKey: "format.indent",
    icon: Indent,
    execute: () => execIndent(),
  },
  {
    kind: "command",
    id: "cmd-outdent",
    labelKey: "format.outdent",
    icon: Outdent,
    execute: () => execOutdent(),
  },
  {
    kind: "command",
    id: "cmd-insertTable",
    labelKey: "menu.insert.table",
    icon: Table,
    execute: () => execInsertTable(),
  },
];

/** 全部动作(Agent 在前,Ribbon 命令在后)/ All actions */
const ALL_ACTIONS = [...AGENT_ACTIONS, ...RIBBON_COMMANDS];

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
  const filteredActions = ALL_ACTIONS.filter((action) => {
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

  const executeAction = async (action: PaletteAction) => {
    if (action.kind === "command") {
      closeModal();
      action.execute();
      return;
    }

    // agent 动作:需文档/选区守卫
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

  const isActionDisabled = (action: PaletteAction): boolean => {
    // Ribbon 命令始终可用(命令层内部有 getView 守卫)
    if (action.kind === "command") {
      return false;
    }
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
                  <action.icon className="size-5" />
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
