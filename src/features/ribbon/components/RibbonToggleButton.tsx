// src/features/ribbon/components/RibbonToggleButton.tsx — 可按压切换的 Ribbon 按钮 / Ribbon toggle button
import type { ReactNode } from "react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type RibbonToggleButtonProps = {
  children?: ReactNode;
  label: string;
  pressed: boolean;
  onPressedChange: () => void;
  testId?: string;
};

export function RibbonToggleButton({
  children,
  label,
  pressed,
  onPressedChange,
  testId,
}: RibbonToggleButtonProps) {
  return (
    <Toggle
      aria-label={label}
      className={cn(
        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 text-xs"
      )}
      data-testid={testId}
      onPressedChange={onPressedChange}
      pressed={pressed}
      title={label}
    >
      {children}
    </Toggle>
  );
}
