// OutlinePanel — 左侧大纲面板 (Document Outline Panel)
// 可折叠，显示文档标题树
// Phase 2: 从编辑器文档中提取标题并渲染大纲树
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** 大纲条目 */
type OutlineItem = {
  paraId: string;
  text: string;
  level: number; // outlineLevel: 0=H1, 1=H2, ...
};

/** 段落块类型 */
type ParagraphBlock = {
  type?: string;
  paraId?: string;
  formatting?: { outlineLevel?: number };
  content?: unknown[];
};
/** 提取段落中的所有文本内容 */
function extractParagraphText(para: ParagraphBlock): string {
  const typedPara = para as {
    content?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (!Array.isArray(typedPara.content)) {
    return "";
  }
  let text = "";
  for (const run of typedPara.content) {
    if (run.type === "run" && Array.isArray(run.content)) {
      for (const node of run.content) {
        if (node.type === "text" && node.text) {
          text += node.text;
        }
      }
    }
  }
  return text;
}
/** 检查段落是否为有效的标题 */
function isHeadingParagraph(para: ParagraphBlock): boolean {
  if (para.type !== "paragraph") {
    return false;
  }
  if (!para.formatting || para.formatting.outlineLevel === undefined) {
    return false;
  }
  if (!para.paraId) {
    return false;
  }
  return extractParagraphText(para).length > 0;
}

/** 从文档中提取所有标题（outlineLevel 存在的段落） */
export function extractHeadings(doc: unknown): OutlineItem[] {
  if (!doc || typeof doc !== "object") {
    return [];
  }
  const pkg = (doc as { package?: { document?: { content?: unknown[] } } })
    .package;
  if (!pkg?.document?.content) {
    return [];
  }
  const items: OutlineItem[] = [];
  for (const block of pkg.document.content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const para = block as ParagraphBlock;
    if (!isHeadingParagraph(para)) {
      continue;
    }
    items.push({
      paraId: para.paraId || "",
      text: extractParagraphText(para),
      level: para.formatting?.outlineLevel ?? 0,
    });
  }
  return items;
}

export function OutlinePanel() {
  const { t } = useT();
  const collapsed = useAppStore((s) => s.outlinePanelCollapsed);
  const toggle = useAppStore((s) => s.toggleOutlinePanel);
  const editorBridge = useDocumentStore((s) => s.editorBridge);
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);

  if (collapsed) {
    return null;
  }

  // 提取标题段落
  const doc = editorBridge?.getDocument();
  const headings = extractHeadings(doc);

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
