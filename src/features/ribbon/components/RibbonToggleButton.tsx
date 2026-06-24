// src/features/ribbon/components/RibbonToggleButton.tsx — 可按压切换的 Ribbon 按钮(图标 + tooltip + 动效)/ Ribbon toggle button
import type { ReactNode } from "react";
import { Toggle } from "@/components/ui/toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RibbonTooltip } from "./RibbonTooltip";

type RibbonToggleButtonProps = {
  children?: ReactNode;
  label: string;
  pressed: boolean;
  onPressedChange: () => void;
  testId?: string;
  /** 快捷键提示(如 "⌘B"),显示在 tooltip / Shortcut hint shown in tooltip */
  shortcut?: string;
};

export function RibbonToggleButton({
  children,
  label,
  pressed,
  onPressedChange,
  testId,
  shortcut,
}: RibbonToggleButtonProps) {
  const toggle = (
    <Toggle
      aria-label={label}
      className={cn(
        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 text-xs",
        "transition duration-150",
        "hover:scale-105 hover:bg-accent hover:text-accent-foreground",
        "active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        pressed ? "bg-accent text-accent-foreground" : ""
      )}
      data-pressed={pressed}
      data-testid={testId}
      onPressedChange={onPressedChange}
      pressed={pressed}
    >
      {children}
    </Toggle>
  );

  return (
    <TooltipProvider>
      <RibbonTooltip label={label} shortcut={shortcut}>
        {toggle}
      </RibbonTooltip>
    </TooltipProvider>
  );
}
