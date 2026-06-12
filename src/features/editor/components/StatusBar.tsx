// StatusBar — 底部状态栏 (Bottom Status Bar)
// 显示页码、字数、缩放控制
// Phase 1: 占位壳，展示静态数据
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import { useDocumentStore } from "@/stores/useDocumentStore";
import { useT } from "@/lib/i18n";

export function StatusBar() {
  const { t } = useT();
  const currentPage = useDocumentStore((s) => s.currentPage);
  const totalPages = useDocumentStore((s) => s.totalPages);
  const zoom = useDocumentStore((s) => s.zoom);

  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-border border-t bg-background px-4 text-muted-foreground text-xs">
      <div className="flex items-center gap-4">
        <span>{t("editor.statusBar.page", { current: currentPage, total: totalPages })}</span>
        <span>{t("editor.statusBar.wordCount", { count: 0 })}</span>
      </div>

      <div className="flex items-center gap-2">
        <span>{t("editor.statusBar.zoom", { zoom })}</span>
        <input
          type="range"
          className="h-3 w-24"
          min={50}
          max={200}
          value={zoom}
          readOnly
          aria-label={t("editor.statusBar.zoom", { zoom })}
        />
      </div>
    </div>
  );
}