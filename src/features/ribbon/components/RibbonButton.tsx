// src/features/ribbon/components/RibbonButton.tsx — Ribbon 普通按钮(图标 + tooltip + 动效)/ Ribbon button
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RibbonTooltip } from "./RibbonTooltip";

type RibbonButtonProps = {
  /** 按钮内容(图标 + 文字)/ Content */
  children: ReactNode;
  /** 点击回调 / Click handler(可选,disabled 按钮可省略) */
  onClick?: () => void;
  /** 是否禁用 / Disabled */
  disabled?: boolean;
  /** aria-label / title */
  label: string;
  /** 测试 ID / Test id */
  testId?: string;
  /** 快捷键提示(如 "⌘B"),显示在 tooltip / Shortcut hint shown in tooltip */
  shortcut?: string;
};

export function RibbonButton({
  children,
  onClick,
  disabled = false,
  label,
  testId,
  shortcut,
}: RibbonButtonProps) {
  const button = (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded px-2 text-xs",
        "transition duration-150",
        "hover:scale-105 hover:bg-accent hover:text-accent-foreground",
        "active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      )}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );

  // tooltip 需 Provider 包裹；用 shortcut 或 label 提示
  return (
    <TooltipProvider>
      <RibbonTooltip label={label} shortcut={shortcut}>
        {button}
      </RibbonTooltip>
    </TooltipProvider>
  );
}
