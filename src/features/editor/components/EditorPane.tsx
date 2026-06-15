// EditorPane — 编辑器容器 (Editor Container)
// Phase 2: 集成 <DocxEditor> 组件并桥接 useEditorBridge
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/proto/workspace.html

import { createEmptyDocument, DocxEditor } from "@eigenpal/docx-editor-react";
import { useEffect } from "react";
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
    injectBridge,
    handleSelectionChange,
    handleChange,
    handleSave: _handleSave,
  } = useEditorBridge();

  // 当 DocxEditor 首次渲染时注入 bridge（解决空状态→编辑状态的时序问题）
  const shouldRenderEditor = documentBuffer != null || isNewDocument;
  useEffect(() => {
    if (shouldRenderEditor) {
      // requestAnimationFrame 确保 DocxEditor 完成 ref 赋值
      const id = requestAnimationFrame(() => injectBridge());
      return () => cancelAnimationFrame(id);
    }
  }, [shouldRenderEditor, injectBridge]);
  // 空状态：无文档（documentBuffer 为 null/undefined 且 非新建文档）
  if (documentBuffer == null && !isNewDocument) {
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
  const docBuffer = documentBuffer ?? null;
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DocxEditor
        document={docProp}
        documentBuffer={docBuffer}
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
