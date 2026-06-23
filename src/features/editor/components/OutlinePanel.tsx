// OutlinePanel — 左侧大纲面板 (Document Outline Panel)
// 可折叠，显示文档标题树
// Phase 2: 从编辑器文档中提取标题并渲染大纲树
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

export function OutlinePanel() {
  const { t } = useT();
  const collapsed = useAppStore((s) => s.outlinePanelCollapsed);
  const toggle = useAppStore((s) => s.toggleOutlinePanel);
  const editorBridge = useDocumentStore((s) => s.editorBridge);
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);
  const headings = useDocumentStore((s) => s.headings);

  if (collapsed) {
    return (
      <button
        aria-label={t("editor.outline.expand")}
        className="flex h-full w-[22px] shrink-0 items-center justify-center border-border border-r bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={toggle}
        title={t("editor.outline.expand")}
        type="button"
      >
        <span
          className="font-medium text-[11px]"
          style={{ writingMode: "vertical-rl" }}
        >
          {t("editor.outline.title")}
        </span>
      </button>
    );
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
            aria-hidden="true"
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

      {/* 大纲树 */}
      {headings.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-muted-foreground text-xs">
            {t("editor.outline.empty")}
          </p>
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {headings.map((heading) => {
              const isActive = selectionInfo?.paraId === heading.paraId;
              return (
                <li key={heading.paraId}>
                  <button
                    className={cn(
                      "w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                      heading.level === 0 ? "font-semibold" : "",
                      heading.level === 1 ? "pl-4" : "",
                      heading.level === 2 ? "pl-6 text-muted-foreground" : "",
                      heading.level >= 3 ? "pl-8 text-muted-foreground" : "",
                      isActive ? "bg-accent text-accent-foreground" : ""
                    )}
                    onClick={() => editorBridge?.scrollToParaId(heading.paraId)}
                    type="button"
                  >
                    {heading.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
