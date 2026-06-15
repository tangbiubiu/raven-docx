// EditorPane — 编辑器容器 (Editor Container)
// Phase 2: 集成 <DocxEditor> 组件并桥接 useEditorBridge
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/proto/workspace.html

import { createEmptyDocument, DocxEditor } from "@eigenpal/docx-editor-react";
import { useT } from "@/lib/i18n";
import { useEditorBridge } from "../hooks/useEditorBridge";
export type EditorPaneProps = {
  /** 已打开的文档 OOXML 字节 */
  documentBuffer?: ArrayBuffer | null;
  /** 是否新建文档 */
  isNewDocument?: boolean;
};
/**
 * 编辑器容器。
 *
 * `documentBuffer` 非 null → 渲染 DocxEditor 显示文档
 * `isNewDocument` → 渲染 DocxEditor + createEmptyDocument()
 * 两者都为 false/null → 显示空状态提示
 */
export function EditorPane({ documentBuffer, isNewDocument }: EditorPaneProps) {
  const { t } = useT();
  const {
    editorRef,
    handleSelectionChange,
    handleChange,
    handleSave: _handleSave,
  } = useEditorBridge();
  // 空状态：无文档（documentBuffer 未传入 且 非新建文档）
  if (documentBuffer === undefined && !isNewDocument) {
    return (
      <div
        className="flex flex-1 items-center justify-center bg-muted/30"
        data-testid="editor-pane-empty"
      >
        <p className="text-muted-foreground">{t("editor.pane.empty")}</p>
      </div>
    );
  }
  // 新建文档或打开已有文档
  const docProp = isNewDocument ? createEmptyDocument() : undefined;
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DocxEditor
        document={docProp}
        documentBuffer={documentBuffer ?? null}
        onChange={handleChange}
        onSelectionChange={handleSelectionChange}
        ref={editorRef}
        showMarginGuides={false}
        showOutline={false}
        showOutlineButton={false}
        showRuler={false}
        showToolbar={false}
        showZoomControl={false}
      />
    </div>
  );
}
