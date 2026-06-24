// src/features/layout/components/PanelPopover.tsx — 面板弹出浮窗 / Panel floating popover
import { type ReactNode, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PanelPopoverProps = {
  /** 浮窗在编辑区的哪一侧 / Side */
  side: "left" | "right";
  /** 是否打开 / Open */
  open: boolean;
  /** 关闭回调(点击遮罩或关闭按钮或 Escape)/ Close callback */
  onClose: () => void;
  /** 浮窗内容 / Content */
  children: ReactNode;
  /** 浮窗宽度(px)/ Width */
  width: number;
};

export function PanelPopover({
  side,
  open,
  onClose,
  children,
  width,
}: PanelPopoverProps) {
  const { t } = useT();
  // 6.4 滑入动画:挂载首帧处于偏移态,下一帧切换到归零,触发 CSS transition
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    // 双重 rAF 确保初始 transform 类先应用,再过渡到 0
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true))
    );
    return () => cancelAnimationFrame(id);
  }, [open]);

  // 6.6 Escape 关闭:监听 keydown
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  // 6.4 left 侧从 -translate-x-full 滑入,right 侧从 translate-x-full 滑入
  const enterClass = entered ? "translate-x-0" : null;
  const leaveClass = side === "left" ? "-translate-x-full" : "translate-x-full";
  const slideClass = enterClass ?? leaveClass;

  return (
    <div
      className="absolute inset-0 z-40"
      data-testid="panel-popover-container"
    >
      {/* 遮罩层:点击遮罩本身关闭(用 target 检测避免拖选误触)*/}
      <div
        className="absolute inset-0"
        data-testid="panel-popover-overlay"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
      {/* 浮窗主体 */}
      <div
        className={cn(
          "absolute top-0 bottom-0 z-50 flex flex-col border-border bg-background shadow-xl",
          "transition-transform duration-200 ease-out",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          slideClass
        )}
        data-testid="panel-popover"
        style={{ width }}
      >
        <div className="flex items-center justify-between border-border border-b px-3 py-2">
          <span className="text-muted-foreground text-xs">
            {side === "left"
              ? t("panel.float.outline")
              : t("panel.float.agent")}
          </span>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
