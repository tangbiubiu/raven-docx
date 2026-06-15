// DocumentTitleBar — 文档标题栏 (Document Title Bar)
// 显示文档名 + 修改标记 + 保存状态 + 新建/打开按钮
// Phase 2: 增加文件操作按钮
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.1

import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";

export type DocumentTitleBarProps = {
  onNew: () => void;
  onOpen: () => void;
};

export function DocumentTitleBar({ onNew, onOpen }: DocumentTitleBarProps) {
  const { t } = useT();
  const documentPath = useDocumentStore((s) => s.documentPath);
  const isDirty = useDocumentStore((s) => s.isDirty);

  const displayName = documentPath
    ? (documentPath.split("/").pop() ?? documentPath)
    : t("document.unnamed");

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-border border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">{displayName}</span>
        {isDirty ? (
          <span
            className="text-muted-foreground text-xs"
            title={t("document.modified")}
          >
            ●
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded px-2 py-1 text-xs hover:bg-accent"
          onClick={onNew}
          type="button"
        >
          {t("menu.file.new")}
        </button>
        <button
          className="rounded px-2 py-1 text-xs hover:bg-accent"
          onClick={onOpen}
          type="button"
        >
          {t("menu.file.open")}
        </button>
        {isDirty ? (
          <span className="text-muted-foreground text-xs">
            {t("document.unsaved")}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("document.saved")}
          </span>
        )}
      </div>
    </div>
  );
}
