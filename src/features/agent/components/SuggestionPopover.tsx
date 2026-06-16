// features/agent/components/SuggestionPopover.tsx — 建议预览弹窗
// 浮动卡片：展示原文本（删除线）+ 建议文本（绿色），接受/拒绝操作
// Reference: .dev/plan/phase3-branch-plan.md §4.6

import { useT } from "@/lib/i18n";
import type { PendingSuggestion } from "../hooks/useAgentCommands";

export type SuggestionPopoverProps = {
  /** 待确认的建议 */
  suggestion: PendingSuggestion;
  /**
   * 弹窗定位（像素坐标，相对于视口）。
   * 由调用方根据编辑器中选区位置计算。
   * 未提供时默认居中。
   */
  position?: { top: number; left: number };
  /** 接受建议回调 */
  onAccept: () => void;
  /** 拒绝建议回调 */
  onReject: () => void;
};

/**
 * SuggestionPopover — Agent 建议预览浮动卡片。
 *
 * 消费方：含 useAgentCommands 的页面组件。
 * 当 useAgentCommands.pendingSuggestion 非 null 时渲染此组件。
 *
 * 定位规则：
 * - 提供 position 时：固定在选区附近（top/left 像素坐标）
 * - 未提供时：视口居中回退
 */
export function SuggestionPopover({
  suggestion,
  position,
  onAccept,
  onReject,
}: SuggestionPopoverProps) {
  const { t } = useT();

  const containerStyle = position
    ? { top: `${position.top}px`, left: `${position.left}px` }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div
      className="fixed z-50 max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={containerStyle}
    >
      {/* 动作类型标签 */}
      <div className="mb-2 font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
        {t(`agent.action.${suggestion.action}`)}
      </div>

      {/* 原始文本（删除线 + 灰色） */}
      <div className="mb-1">
        <span className="text-gray-400 text-xs dark:text-gray-500">
          原文本：
        </span>
        <p className="mt-0.5 text-gray-400 text-sm line-through dark:text-gray-500">
          {suggestion.originalText}
        </p>
      </div>

      {/* 建议文本（绿色高亮） */}
      <div className="mb-3">
        <span className="text-green-600 text-xs dark:text-green-400">
          建议：
        </span>
        <p className="mt-0.5 text-green-700 text-sm dark:text-green-300">
          {suggestion.suggestedText}
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button
          className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={onReject}
          type="button"
        >
          {t("agent.suggestion.reject")}
        </button>
        <button
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-700"
          onClick={onAccept}
          type="button"
        >
          {t("agent.suggestion.accept")}
        </button>
      </div>
    </div>
  );
}
