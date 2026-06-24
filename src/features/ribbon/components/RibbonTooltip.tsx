// src/features/ribbon/components/RibbonTooltip.tsx — Ribbon 按钮 tooltip(含快捷键提示)/ Ribbon button tooltip with shortcut
import type { ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type RibbonTooltipProps = {
  /** tooltip 主文本(通常 = 按钮 label)/ Tooltip label */
  label: string;
  /** 快捷键提示(如 "⌘B")/ Shortcut hint */
  shortcut?: string;
  /** 触发元素(asChild)/ Trigger element */
  children: ReactElement;
};

/**
 * Ribbon 按钮 tooltip — hover 显示标签 + 可选快捷键。
 * / Ribbon button tooltip — shows label + optional shortcut on hover.
 */
export function RibbonTooltip({
  label,
  shortcut,
  children,
}: RibbonTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {shortcut ? (
            <kbd className="rounded bg-background/20 px-1 py-0.5 font-medium text-[10px]">
              {shortcut}
            </kbd>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
