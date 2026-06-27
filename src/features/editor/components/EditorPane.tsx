// EditorPane — 编辑器容器 (Editor Container)
// Phase 2: 集成 <DocxEditor> 组件并桥接 useEditorBridge
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/proto/workspace.html

import { zhCN } from "@eigenpal/docx-editor-i18n";
import { createEmptyDocument, DocxEditor } from "@eigenpal/docx-editor-react";
import { useEffect } from "react";
import { FONT_FAMILIES } from "@/features/formatting/constants";
import { injectFontAliases } from "@/features/formatting/font-aliases";
import { useT } from "@/lib/i18n";
import { useAgentStore } from "@/stores/useAgentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useEditorBridge } from "../hooks/useEditorBridge";
export type EditorPaneProps = {
  /** 已打开的文档 OOXML 字节 */
  documentBuffer?: ArrayBuffer | null;
  /** 是否新建文档 */
  isNewDocument?: boolean;
};

/**
 * 传递给 DocxEditor 的字体清单(库 fontFamilies prop)。
 * 必须是 module-level 稳定引用,避免每次 render 重建数组导致 picker memo 失效。
 * 格式: FontOption { name, fontFamily, category }
 */
const EDITOR_FONT_FAMILIES = FONT_FAMILIES.filter(
  (f) => f.value !== "default"
).map((f) => ({
  name: f.label,
  fontFamily: f.font,
}));
/**
 * locale → 编辑器 i18n 映射。
 * zh-CN 用上游社区翻译;其余 locale 传 undefined,回落编辑器默认英文。
 * module-level 稳定引用,避免每次 render 重建对象。
 */
const EDITOR_I18N_BY_LOCALE: Record<string, typeof zhCN | undefined> = {
  "zh-CN": zhCN,
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
  const locale = useSettingsStore((s) => s.editorConfig.locale);
  const isEditorLocked = useAgentStore((s) => s.isEditorLocked);
  const {
    editorRef,
    injectBridge,
    handleSelectionChange,
    handleChange,
    handleSave: _handleSave,
  } = useEditorBridge();

  // 当 DocxEditor 首次渲染时注入 bridge（解决空状态→编辑状态的时序问题）
  const shouldRenderEditor =
    (documentBuffer !== null && documentBuffer !== undefined) || isNewDocument;
  useEffect(() => {
    if (shouldRenderEditor) {
      // requestAnimationFrame 确保 DocxEditor 完成 ref 赋值
      const id = requestAnimationFrame(() => injectBridge());
      return () => cancelAnimationFrame(id);
    }
  }, [shouldRenderEditor, injectBridge]);

  // 注入 CJK 字体跨平台别名(@font-face local()),幂等
  useEffect(() => {
    injectFontAliases();
  }, []);
  // 空状态：无文档（documentBuffer 为 null/undefined 且 非新建文档）
  if (
    (documentBuffer === null || documentBuffer === undefined) &&
    !isNewDocument
  ) {
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
      {isEditorLocked ? (
        <div className="bg-primary/10 px-3 py-1 text-center text-primary text-xs">
          {t("editor.locked.agentWorking")}
        </div>
      ) : null}
      <DocxEditor
        document={docProp}
        documentBuffer={docBuffer}
        fontFamilies={EDITOR_FONT_FAMILIES}
        i18n={EDITOR_I18N_BY_LOCALE[locale]}
        onChange={handleChange}
        onSelectionChange={handleSelectionChange}
        readOnly={isEditorLocked}
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
