// StatusBar — 底部状态栏 (Bottom Status Bar)
// Phase 2: 实时显示页码、字数、缩放比例、保存状态
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/proto/workspace.html

import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { ZoomControl } from "./ZoomControl";

/**
 * 底部状态栏。
 * 从 useDocumentStore 读取状态，不直接调用编辑器 API。
 */
export function StatusBar() {
  const { t } = useT();
  const currentPage = useDocumentStore((s) => s.currentPage);
  const totalPages = useDocumentStore((s) => s.totalPages);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const charCount = useDocumentStore((s) => s.charCount);
  const isAutoSaving = useDocumentStore((s) => s.isAutoSaving);

  return (
    <div
      className="flex h-7 shrink-0 items-center justify-between border-border border-t bg-muted/60 px-4 text-muted-foreground text-xs"
      data-testid="status-bar"
    >
      {/* 左侧：保存状态 + 页码 + 字数 + 语言 + 自动保存 */}
      <div className="flex items-center gap-4">
        <span data-testid="dirty-status">
          {isDirty ? t("editor.statusBar.dirty") : t("editor.statusBar.saved")}
        </span>
        <span>
          {t("editor.statusBar.page", {
            current: currentPage,
            total: totalPages,
          })}
        </span>
        <span data-testid="word-count">
          {t("editor.statusBar.wordCount", { count: charCount })}
        </span>
        <span data-testid="language">{t("editor.statusBar.language")}</span>
        {!!isAutoSaving && (
          <span className="text-primary" data-testid="auto-save-indicator">
            {t("editor.statusBar.autoSaving")}
          </span>
        )}
      </div>

      {/* 右侧：缩放控制 */}
      <ZoomControl />
    </div>
  );
}
