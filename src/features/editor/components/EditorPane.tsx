// EditorPane — 编辑器容器 (Editor Container)
// Phase 1: 占位容器，显示空白页面区域
// 完整 DocxEditor 集成在 Phase 2 实现
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.2

/**
 * 编辑器占位容器。
 * Phase 2 将替换为 `<DocxEditor>` 组件并集成 useEditorBridge。
 */
export function EditorPane() {
  return (
    <div className="flex flex-1 flex-col items-center overflow-auto bg-muted/30 p-8">
      {/* 模拟页面纸张 */}
      <div className="flex w-full max-w-[760px] flex-1 flex-col bg-background p-16 shadow-sm">
        <div className="mb-6 h-8 w-3/4 rounded bg-muted/60" />
        <div className="mb-3 h-4 w-full rounded bg-muted/40" />
        <div className="mb-3 h-4 w-11/12 rounded bg-muted/40" />
        <div className="mb-3 h-4 w-4/5 rounded bg-muted/40" />
        <div className="mb-6 h-4 w-2/3 rounded bg-muted/40" />

        <div className="mb-4 h-6 w-1/2 rounded bg-muted/50" />
        <div className="mb-3 h-4 w-full rounded bg-muted/40" />
        <div className="mb-3 h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-3/4 rounded bg-muted/40" />
      </div>
    </div>
  );
}