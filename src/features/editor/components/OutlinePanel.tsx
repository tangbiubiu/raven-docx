// OutlinePanel — 左侧大纲面板 (Document Outline Panel)
// 可折叠，显示文档标题树
// Phase 1: 占位壳，展示空状态
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

export function OutlinePanel() {
  const { t } = useT();
  const collapsed = useAppStore((s) => s.outlinePanelCollapsed);
  const toggle = useAppStore((s) => s.toggleOutlinePanel);

  if (collapsed) {
    return null;
  }

  return (
    <aside
      aria-label={t("editor.outline.title")}
      className={cn(
        "flex w-[220px] shrink-0 flex-col border-border border-r bg-background"
      )}
    >
      {/* 面板标题 */}
      <div className="flex items-center justify-between border-border border-b px-3 py-2">
        <span className="font-medium text-muted-foreground text-xs">
          {t("editor.outline.title")}
        </span>
        <button
          aria-label={t("editor.outline.title")}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={toggle}
          type="button"
        >
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Phase 1: 空状态占位 */}
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-muted-foreground text-xs">
          {t("editor.outline.empty")}
        </p>
      </div>
    </aside>
  );
}
