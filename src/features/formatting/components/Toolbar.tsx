// Toolbar — 格式工具栏 (Formatting Toolbar)
// Phase 1: 占位容器，仅显示布局结构
// 完整格式工具栏在 Phase 2 实现
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.3

import { useT } from "@/lib/i18n";

export function Toolbar() {
  const { t } = useT();

  return (
    <div
      aria-label={t("format.bold")}
      className="flex h-12 shrink-0 items-center gap-2 border-border border-b bg-background px-4"
      role="toolbar"
    >
      {/* Phase 1: 占位提示 */}
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground text-xs">
          {t("format.bold")}
        </span>
        <span className="text-muted-foreground/50 text-xs">|</span>
        <span className="text-muted-foreground text-xs">
          {t("format.italic")}
        </span>
        <span className="text-muted-foreground/50 text-xs">|</span>
        <span className="text-muted-foreground text-xs">
          {t("format.underline")}
        </span>
        <span className="text-muted-foreground/50 text-xs">|</span>
        <span className="text-muted-foreground text-xs">
          {t("format.heading1")}
        </span>
        <span className="text-muted-foreground/50 text-xs">|</span>
        <span className="text-muted-foreground text-xs">
          {t("format.alignLeft")}
        </span>
      </div>
    </div>
  );
}
