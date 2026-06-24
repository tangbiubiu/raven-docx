// src/features/ribbon/components/RibbonGroup.tsx — Ribbon 组容器(标题 + 子元素)/ Ribbon group container
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type RibbonGroupProps = {
  /** 组标题 i18n key / Group label key */
  labelKey: string;
  /** 组内按钮 / Children */
  children: ReactNode;
  /** 额外 className */
  className?: string;
};

export function RibbonGroup({
  labelKey,
  children,
  className,
}: RibbonGroupProps) {
  const { t } = useT();
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-1 items-end gap-0.5 pb-1">{children}</div>
      <div className="border-border border-t pt-0.5 text-center text-[11px] text-muted-foreground uppercase tracking-wide">
        {t(labelKey)}
      </div>
    </div>
  );
}
