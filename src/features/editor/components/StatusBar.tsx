// StatusBar — 底部状态栏 (Bottom Status Bar)
// Phase 2: 实时显示页码、字数、缩放比例、保存状态
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/proto/workspace.html

import { useDocumentStore } from "@/stores/useDocumentStore";

/**
 * 底部状态栏。
 * 从 useDocumentStore 读取状态，不直接调用编辑器 API。
 */
export function StatusBar() {
  const currentPage = useDocumentStore((s) => s.currentPage);
  const totalPages = useDocumentStore((s) => s.totalPages);
  const zoom = useDocumentStore((s) => s.zoom);
  const isDirty = useDocumentStore((s) => s.isDirty);

  return (
    <div
      className="flex h-7 shrink-0 items-center justify-between border-border border-t bg-background px-4 text-muted-foreground text-xs"
      data-testid="status-bar"
    >
      {/* 左侧：保存状态 + 页码 + 字数 */}
      <div className="flex items-center gap-4">
        <span data-testid="dirty-status">
          {isDirty ? "● 未保存" : "✓ 已保存"}
        </span>
        <span>
          第 {currentPage}/{totalPages} 页
        </span>
        <span>— 字</span>
      </div>

      {/* 右侧：缩放 */}
      <div className="flex items-center gap-2">
        <span>{zoom}%</span>
      </div>
    </div>
  );
}
