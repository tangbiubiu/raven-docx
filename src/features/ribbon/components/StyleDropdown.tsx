// src/features/ribbon/components/StyleDropdown.tsx — 样式下拉 / Style dropdown
// P0 样式库:样式列表来自文档 styles.xml(经 StyleResolver),而非硬编码标题。
// 选中样式 → execApplyStyle(styleId) 写入 w:pStyle + 解析后的段落/文字格式;
// "清除样式" → execClearStyle 回正文。

import { createStyleResolver } from "@eigenpal/docx-editor-core/prosemirror";
import type { Document } from "@eigenpal/docx-editor-core/types/document";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { execApplyStyle, execClearStyle } from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";

/** "清除样式"选项的哨兵 value（与真实 styleId 不可能冲突） */
const CLEAR_VALUE = "__clear_style__";

/** 从文档 styles.xml 提取可用段落样式（StyleResolver 级联已解析） */
function getParagraphStyles(): Array<{ styleId: string; name: string }> {
  const doc = useDocumentStore.getState().editorBridge?.getDocument();
  if (!doc || typeof doc !== "object") {
    return [];
  }
  const styles = (doc as Document).package?.styles;
  if (!styles) {
    return [];
  }
  return createStyleResolver(styles)
    .getParagraphStyles()
    .filter((s) => !s.hidden)
    .map((s) => ({ styleId: s.styleId, name: s.name ?? s.styleId }));
}

/**
 * 样式下拉 — 只订阅 selectionFormat.styleId（选区变化时重渲染），
 * 样式列表每次渲染从 bridge 读取（store.document 在 agent 重载后为 null，
 * 真正的 Document 在编辑器内部）。
 */
export function StyleDropdown() {
  const { t } = useT();
  const styleId = useDocumentStore((s) => s.selectionFormat?.styleId);
  const styles = getParagraphStyles();

  // 无显式样式 → 显示 "Normal"（Word 中未标样式段落即 Normal）
  const hasNormal = styles.some((s) => s.styleId === "Normal");
  const current = styleId || (hasNormal ? "Normal" : "");

  return (
    <Select
      onValueChange={(v) => {
        if (v === CLEAR_VALUE) {
          execClearStyle();
        } else {
          execApplyStyle(v);
        }
      }}
      value={current}
    >
      <SelectTrigger
        className="h-7 w-[110px] text-xs"
        data-testid="ribbon-style"
        size="sm"
      >
        <SelectValue placeholder={t("format.normal")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CLEAR_VALUE}>{t("format.clearStyle")}</SelectItem>
        {styles.map((s) => (
          <SelectItem key={s.styleId} value={s.styleId}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
