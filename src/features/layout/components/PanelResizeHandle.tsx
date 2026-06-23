// src/features/layout/components/PanelResizeHandle.tsx — 面板拖拽调宽手柄 / Panel resize handle
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useResizablePanel } from "../hooks/useResizablePanel";

type PanelResizeHandleProps = {
  side: "left" | "right";
  currentWidth: number;
  onResize: (width: number) => void;
  labelKey: string;
};

export function PanelResizeHandle({
  side,
  currentWidth,
  onResize,
  labelKey,
}: PanelResizeHandleProps) {
  const { t } = useT();
  const { onPointerDown } = useResizablePanel({
    side,
    currentWidth,
    onResize,
  });

  return (
    <hr
      aria-label={t(labelKey)}
      aria-orientation="vertical"
      className={cn(
        "group relative z-10 w-1 shrink-0 cursor-col-resize bg-border transition-colors",
        "hover:w-1.5 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          onResize(currentWidth - 8);
        } else if (e.key === "ArrowRight") {
          onResize(currentWidth + 8);
        }
      }}
      onPointerDown={onPointerDown}
      tabIndex={0}
      title={t(labelKey)}
    />
  );
}
