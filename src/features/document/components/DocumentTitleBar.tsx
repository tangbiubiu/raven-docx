// DocumentTitleBar — 文档标题栏 (Document Title Bar)
// 显示文档名 + 修改标记 + 保存状态
// Phase 1: 占位壳，仅显示布局结构
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.1

import { useDocumentStore } from "@/stores/useDocumentStore";
import { useT } from "@/lib/i18n";

export function DocumentTitleBar() {
  const { t } = useT();
  const documentPath = useDocumentStore((s) => s.documentPath);
  const isDirty = useDocumentStore((s) => s.isDirty);

  const displayName = documentPath
    ? documentPath.split("/").pop() ?? documentPath
    : t("document.unnamed");

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-border border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">{displayName}</span>
        {isDirty && (
          <span className="text-muted-foreground text-xs" title={t("document.modified")}>
            ●
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isDirty ? (
          <span className="text-muted-foreground text-xs">{t("document.unsaved")}</span>
        ) : (
          <span className="text-muted-foreground text-xs">{t("document.saved")}</span>
        )}
      </div>
    </div>
  );
}