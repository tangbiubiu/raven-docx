// src/features/layout/components/CollapsedPanelTrigger.tsx — 折叠态竖条触发器 / Collapsed panel trigger
// 6.5 用 lucide 图标替代旋转文字
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CollapsedPanelTriggerProps = {
  /** 面板在编辑区的哪一侧 / Panel side */
  side: "left" | "right";
  /** aria-label / title 的 i18n 键(展开操作)/ i18n key for expand action */
  labelKey: string;
  /** 点击展开 / Click to open float */
  onClick: () => void;
};

export function CollapsedPanelTrigger({
  side,
  labelKey,
  onClick,
}: CollapsedPanelTriggerProps) {
  const { t } = useT();
  const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  return (
    <button
      aria-label={t(labelKey)}
      className={cn(
        "flex h-full w-8 shrink-0 items-center justify-center",
        "border-border bg-background text-muted-foreground",
        "hover:bg-accent hover:text-accent-foreground",
        side === "left" ? "border-r" : "border-l"
      )}
      onClick={onClick}
      title={t(labelKey)}
      type="button"
    >
      <Icon className="size-4" />
    </button>
  );
}
