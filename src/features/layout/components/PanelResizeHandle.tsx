// src/features/layout/components/PanelResizeHandle.tsx — 面板拖拽调宽手柄 / Panel resize handle
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useResizablePanel } from "../hooks/useResizablePanel";

type PanelResizeHandleProps = {
  side: "left" | "right";
  currentWidth: number;
  onResize: (width: number) => void;
  /** 双击恢复默认宽度回调 / Reset to default width on double-click */
  onReset: () => void;
  labelKey: string;
};

export function PanelResizeHandle({
  side,
  currentWidth,
  onResize,
  onReset,
  labelKey,
}: PanelResizeHandleProps) {
  const { t } = useT();
  const { onPointerDown, isDragging } = useResizablePanel({
    side,
    currentWidth,
    onResize,
  });

  return (
    <div className="group relative z-10 flex shrink-0 cursor-col-resize items-stretch">
      {/* 6.1 拖拽 handle 视觉:默认 1px 细条,hover/group 拖拽时加宽 + 高亮 */}
      <hr
        aria-label={t(labelKey)}
        aria-orientation="vertical"
        className={cn(
          "w-px shrink-0 cursor-col-resize bg-border/50",
          "transition-[width,background-color] duration-150 ease-out",
          "group-hover:w-1.5 group-hover:bg-primary/60",
          "focus-visible:w-1.5 focus-visible:bg-primary/60 focus-visible:outline-none",
          isDragging ? "w-1.5 bg-primary/60" : null
        )}
        onDoubleClick={onReset}
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
      {/* 6.2 拖拽时实时宽度 tooltip */}
      {isDragging ? (
        <div
          aria-hidden="true"
          className={cn(
            "-translate-y-1/2 pointer-events-none absolute top-1/2 z-20",
            "rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground shadow",
            side === "left" ? "left-3" : "right-3"
          )}
          data-testid="resize-width-tooltip"
        >
          {currentWidth}px
        </div>
      ) : null}
    </div>
  );
}
