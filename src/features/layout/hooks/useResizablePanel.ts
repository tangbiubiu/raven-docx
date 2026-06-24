// src/features/layout/hooks/useResizablePanel.ts — 拖拽调宽逻辑 / Drag-to-resize logic
import { useRef, useState } from "react";

type ResizablePanelOptions = {
  /** 面板在编辑器的哪一侧 / Panel side */
  side: "left" | "right";
  /** 当前宽度(px) / Current width */
  currentWidth: number;
  /** 宽度变化回调(接收未 clamp 的新宽度,由调用方或 store clamp)/ Resize callback */
  onResize: (width: number) => void;
};

/**
 * 拖拽调宽 hook。
 * 左栏:鼠标向右移动 → 宽度增加(Δ = clientX - startX)
 * 右栏:鼠标向左移动 → 宽度增加(Δ = startX - clientX)
 *
 * 暴露 isDragging 状态供调用方显示拖拽中的宽度 tooltip 等反馈。
 */
export function useResizablePanel({
  side,
  currentWidth,
  onResize,
}: ResizablePanelOptions) {
  const startXRef = useRef<number | null>(null);
  const startWidthRef = useRef(currentWidth);
  const onResizeRef = useRef(onResize);
  const [isDragging, setIsDragging] = useState(false);
  onResizeRef.current = onResize;

  function handlePointerMove(e: PointerEvent) {
    if (startXRef.current === null) {
      return;
    }
    const delta = e.clientX - startXRef.current;
    const newWidth =
      side === "left"
        ? startWidthRef.current + delta
        : startWidthRef.current - delta;
    onResizeRef.current(newWidth);
  }

  function handlePointerUp() {
    startXRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setIsDragging(false);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    setIsDragging(true);
  }

  return { onPointerDown, isDragging };
}
