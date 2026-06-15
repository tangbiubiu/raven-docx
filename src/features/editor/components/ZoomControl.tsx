// ZoomControl — 缩放控制组件 (Zoom Control)
// Phase 2: 滑块 + 百分比显示 + 重置按钮
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const STEP = 5;

/**
 * 缩放控制。
 * 读取 useDocumentStore.zoom，onChange 时调用 setZoom。
 * 包含滑块、百分比文本、重置按钮（非 100% 时显示）。
 */
export function ZoomControl() {
  const { t } = useT();
  const zoom = useDocumentStore((s) => s.zoom);
  const setZoom = useDocumentStore((s) => s.setZoom);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!Number.isNaN(value)) {
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)));
    }
  };

  const handleReset = () => {
    setZoom(100);
  };

  return (
    <div className="flex items-center gap-2" data-testid="zoom-control">
      {zoom !== 100 ? (
        <button
          aria-label={t("editor.statusBar.zoom", { zoom: 100 })}
          className="rounded px-1 text-muted-foreground text-xs hover:bg-accent hover:text-accent-foreground"
          onClick={handleReset}
          type="button"
        >
          100%
        </button>
      ) : null}
      <span className="min-w-[3ch] text-center text-xs tabular-nums">
        {t("editor.statusBar.zoom", { zoom })}
      </span>
      <input
        aria-label={t("editor.statusBar.zoom", { zoom })}
        className="h-1 w-20 cursor-pointer accent-accent-foreground"
        max={MAX_ZOOM}
        min={MIN_ZOOM}
        onChange={handleSliderChange}
        step={STEP}
        type="range"
        value={zoom}
      />
    </div>
  );
}
