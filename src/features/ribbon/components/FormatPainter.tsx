// src/features/ribbon/components/FormatPainter.tsx — 格式刷 / Format Painter
// 复制选区格式(文本+段落)→ 激活 → 下次有效选区自动应用 → 清除
// Reference: .dev/plan/2026-06-25-format-painter-redesign.md §3.3-3.5

import { Paintbrush } from "lucide-react";
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useFormatPainterStore } from "@/stores/useFormatPainterStore";
import {
  applySnapshot,
  collectFormatPainterSnapshot,
} from "./format-painter-logic";

/**
 * 格式刷按钮:点击复制当前选区格式(文本+段落)并激活;
 * 激活后下次非空选区(非光标移动)自动应用并清除;Esc 取消。
 */
export function FormatPainter() {
  const { t } = useT();
  const active = useFormatPainterStore((s) => s.active);
  const storedMarks = useFormatPainterStore((s) => s.marks);
  const setFormatPainter = useFormatPainterStore((s) => s.setFormatPainter);
  const clearFormatPainter = useFormatPainterStore((s) => s.clearFormatPainter);
  const selectionFormat = useDocumentStore((s) => s.selectionFormat);
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);

  // 跟踪激活后是否已观察到一次选区变化 / Track post-activation selection change
  const armedRef = useRef(false);

  // 激活时 arm,等待下次选区变化 / Arm on activation, await next selection change
  useEffect(() => {
    armedRef.current = active;
  }, [active]);

  // 选区变化时,若已激活且已 arm,仅在有效选区(非空 from!==to)时应用并清除
  useEffect(() => {
    if (!(active && storedMarks && armedRef.current)) {
      return;
    }
    // 光标移动(from===to)不触发应用,保持激活等待拖选
    if (!selectionInfo || selectionInfo.from === selectionInfo.to) {
      return;
    }
    applySnapshot(storedMarks);
    clearFormatPainter();
  }, [active, storedMarks, selectionInfo, clearFormatPainter]);

  const handleClick = () => {
    if (active) {
      clearFormatPainter();
      return;
    }
    if (!selectionFormat) {
      return;
    }
    // 从 EditorView 采集段落格式(选区段落一致才有 paragraph)
    const bridge = useDocumentStore.getState().editorBridge;
    const view = bridge?.getEditorView() ?? null;
    setFormatPainter(collectFormatPainterSnapshot(view, selectionFormat));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && active) {
      e.preventDefault();
      clearFormatPainter();
    }
  };

  return (
    <button
      aria-label={t("format.formatPainter")}
      aria-pressed={active}
      className={cn(
        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded px-2 text-xs",
        "transition duration-150",
        "hover:scale-105 hover:bg-accent hover:text-accent-foreground",
        "active:scale-95",
        active ? "bg-accent text-accent-foreground" : ""
      )}
      data-pressed={active}
      data-testid="ribbon-formatPainter"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={t("format.formatPainter")}
      type="button"
    >
      <Paintbrush className="size-4" />
    </button>
  );
}
