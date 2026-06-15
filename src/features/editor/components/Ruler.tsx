// Ruler — 水平和垂直标尺 (Horizontal and Vertical Rulers)
// Phase 2: 显示页边距标记，支持缩放
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import type { Layout } from "@eigenpal/docx-editor-core/layout-engine/types";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** 像素转厘米 (96 DPI) */
const PX_TO_CM = 2.54 / 96;

/** 像素转英寸 */
const PX_TO_INCH = 1 / 96;

export type RulerUnit = "cm" | "inch";

type RulerProps = {
  unit?: RulerUnit;
};

export function Ruler({ unit = "cm" }: RulerProps) {
  const zoom = useDocumentStore((s) => s.zoom);
  const bridge = useDocumentStore((s) => s.editorBridge);

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

  return (
    <>
      {/* 水平标尺 */}
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

      {/* 垂直标尺 */}
      <div
        className={cn(
          "absolute top-6 left-0 flex w-6 shrink-0 flex-col items-center",
          "border-border border-r bg-muted/50 text-xs"
        )}
        style={{ height: `${pageHeight}px` }}
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
    </>
  );
}
