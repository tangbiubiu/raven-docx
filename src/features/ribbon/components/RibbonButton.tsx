// src/features/ribbon/components/RibbonButton.tsx — Ribbon 普通按钮 / Ribbon button
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
};

export function RibbonButton({
  children,
  onClick,
  disabled = false,
  label,
  testId,
}: RibbonButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded px-2 text-xs",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50"
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
}
