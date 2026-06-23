// OutlinePanel — 左侧大纲面板 (Document Outline Panel)
// 显示文档标题树,折叠/展开由 WorkspacePage 统一编排
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/stores/useDocumentStore";

export function OutlinePanel() {
  const { t } = useT();
  const editorBridge = useDocumentStore((s) => s.editorBridge);
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);
  const headings = useDocumentStore((s) => s.headings);

  return (
    <aside
      aria-label={t("editor.outline.title")}
      className="flex h-full w-full flex-col border-border border-r bg-background"
    >
      {/* 面板标题 / Panel header */}
      <div className="flex items-center border-border border-b px-3 py-2">
        <span className="font-medium text-muted-foreground text-xs">
          {t("editor.outline.title")}
        </span>
      </div>

      {/* 大纲树 / Outline tree */}
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
