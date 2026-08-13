// Ruler — 水平和垂直标尺 (Horizontal and Vertical Rulers)
// Phase 2: 显示页边距标记，支持缩放
// UI Overhaul p2: 水平标尺与居中页面同轴(flex justify-center,免测量);
// 垂直标尺用 ResizeObserver 测容器宽,贴页面左缘(偏移≥24px 时画在页面外空白,
// 否则贴中栏左缘,落在默认 96px 页边距内,不压文字区)。不做滚动同步(D2a,只显示第 1 页)。
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import type { Layout } from "@eigenpal/docx-editor-core/layout-engine/types";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** 像素转厘米 (96 DPI) */
const PX_TO_CM = 2.54 / 96;

/** 像素转英寸 */
const PX_TO_INCH = 1 / 96;

/** 垂直标尺宽度 (px) */
const V_RULER_W = 24;

export type RulerUnit = "cm" | "inch";

type RulerProps = {
  unit?: RulerUnit;
};

export function Ruler({ unit = "cm" }: RulerProps) {
  const zoom = useDocumentStore((s) => s.zoom);
  const bridge = useDocumentStore((s) => s.editorBridge);

  // 容器宽度测量(供垂直标尺定位;hooks 必须在早退之前)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    // jsdom 无 ResizeObserver: 守卫降级(containerWidth 保持 0,垂直标尺贴左缘)
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = bridge?.getLayout() as Layout | null;
  const page = layout?.pages[0];
  if (!page) {
    return null;
  }

  const { margins, size } = page;
  const scale = zoom / 100;
  const toUnit = (px: number) =>
    (unit === "cm" ? px * PX_TO_CM : px * PX_TO_INCH).toFixed(1);

  const pageWidth = size.w * scale;
  const pageHeight = size.h * scale;
  const marginLeft = margins.left * scale;
  const marginRight = margins.right * scale;
  const marginTop = margins.top * scale;
  const marginBottom = margins.bottom * scale;

  // 页面左缘相对容器偏移(容器内水平居中)。放置硬规则(p2 评审):
  // 偏移 ≥ 24px(标尺宽)时画在页面左缘的空白区;不足则贴中栏左缘(页边距内,不压文字区)。
  const pageLeftOffset = Math.max(0, (containerWidth - pageWidth) / 2);
  const vRulerLeft = pageLeftOffset >= V_RULER_W ? pageLeftOffset : 0;

  return (
    <div
      className="relative w-full shrink-0"
      data-testid="ruler-container"
      ref={containerRef}
    >
      {/* 水平标尺 — 与居中页面同轴 */}
      <div className="flex justify-center">
        <div
          className={cn(
            "relative flex h-6 shrink-0 items-end bg-muted/50",
            "border-border border-b text-xs"
          )}
          style={{ width: `${pageWidth}px` }}
          title="horizontal ruler"
        >
          {/* 左边距标记 */}
          <div
            className="absolute bottom-0 h-3 w-0.5 bg-foreground/40"
            style={{ left: `${marginLeft}px` }}
          />
          <span
            className="-translate-x-1/2 absolute bottom-3 text-foreground/60"
            style={{ left: `${marginLeft}px` }}
          >
            {toUnit(margins.left)}
          </span>

          {/* 右边距标记 */}
          <div
            className="absolute bottom-0 h-3 w-0.5 bg-foreground/40"
            style={{ right: `${marginRight}px` }}
          />
          <span
            className="absolute bottom-3 translate-x-1/2 text-foreground/60"
            style={{ right: `${marginRight}px` }}
          >
            {toUnit(margins.right)}
          </span>
        </div>
      </div>

      {/* 垂直标尺 — 贴页面左缘;只显示第 1 页,不滚动同步(D2a) */}
      <div
        className={cn(
          "absolute top-6 flex w-6 shrink-0 flex-col items-center",
          "border-border border-r bg-muted/50 text-xs"
        )}
        style={{ height: `${pageHeight}px`, left: `${vRulerLeft}px` }}
        title="vertical ruler"
      >
        {/* 上边距标记 */}
        <div
          className="absolute right-0 h-0.5 w-3 bg-foreground/40"
          style={{ top: `${marginTop}px` }}
        />
        <span
          className="-translate-y-1/2 -rotate-90 absolute right-3 text-foreground/60"
          style={{ top: `${marginTop}px` }}
        >
          {toUnit(margins.top)}
        </span>

        {/* 下边距标记 */}
        <div
          className="absolute right-0 h-0.5 w-3 bg-foreground/40"
          style={{ bottom: `${marginBottom}px` }}
        />
        <span
          className="-rotate-90 absolute right-3 translate-y-1/2 text-foreground/60"
          style={{ bottom: `${marginBottom}px` }}
        >
          {toUnit(margins.bottom)}
        </span>
      </div>
    </div>
  );
}
