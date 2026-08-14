// editor/commands/document-structure.ts — 文档结构:分页符、目录、分节符、分栏、水印。
// 分栏为 headless 直改(库无公开分栏 setter),其余委托库 PM 命令。

import { parseDocx, serializeDocx } from "@eigenpal/docx-editor-core";
import { updateDocumentXml } from "@eigenpal/docx-editor-core/docx/rezip";
import {
  generateTOC,
  getWatermarkFromState,
  insertPageBreak,
  setWatermark,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import {
  insertSectionBreak,
  removeSectionBreak,
} from "@eigenpal/docx-editor-core/prosemirror/commands/paragraph";
import type { TextWatermark } from "@eigenpal/docx-editor-core/types/document";
import {
  applyColumnsToDoc,
  type ColumnOptions,
} from "@/features/page-layout/columns";
import { commands as tauriCommands } from "@/lib/bindings";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { apply, getView } from "./shared";

// === 分页 ===

/** 插入分页符 / Insert a page break at the cursor */
export function execInsertPageBreak(): void {
  apply(insertPageBreak);
}

// === 目录 (P0: TOC) ===

/** 插入目录(基于标题样式 + field 域)/ Insert a table of contents */
export function execGenerateTOC(): void {
  apply(generateTOC);
}

// === 分节符 ===

/** 插入分节符(分节符与分栏同属"页面"组)/ Insert a section break */
export function execInsertSectionBreak(
  breakType: "nextPage" | "continuous" | "oddPage" | "evenPage"
): void {
  apply(insertSectionBreak(breakType));
}

/** 移除光标所在段的分节符 / Remove the section break at the cursor */
export function execRemoveSectionBreak(): void {
  apply(removeSectionBreak);
}

// === 水印 (P0) ===

/**
 * 设置文本水印(null 清除)/ Set text watermark (null clears).
 * 库命令为 doc 属性操作,随 undo/redo。
 */
export function execSetWatermark(watermark: TextWatermark | null): void {
  apply(setWatermark(watermark));
}

/** 读取当前水印(仅文本水印)/ Get current text watermark, or null. */
export function execGetWatermark(): TextWatermark | null {
  const view = getView();
  if (!view) {
    return null;
  }
  const wm = getWatermarkFromState(view.state);
  return wm && wm.kind === "text" ? wm : null;
}

// === 分栏 (P0) ===
// 库无公开分栏 setter → headless 直改:save 落盘 → parseDocx 改
// finalSectionProperties → serializeDocx + updateDocumentXml 回写 →
// 临时文件 → reloadFromTemp 重载编辑器(复用 agent 回环基础设施)。

/**
 * 设置整页分栏(1/2/3 栏或自定义)/ Set whole-page columns.
 *
 * 1. bridge.save() 先落盘 PM 未保存改动(防直改丢编辑,计划 §4.2 风险)
 * 2. parseDocx → applyColumnsToDoc → serializeDocx → updateDocumentXml
 * 3. 写临时文件 → reloadFromTemp(镜像 useAgentSession 的 save→reload 回环)
 */
export async function execSetColumns(opts: ColumnOptions): Promise<void> {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const buffer = await bridge.save();
  if (!buffer) {
    return;
  }
  try {
    const doc = await parseDocx(buffer);
    applyColumnsToDoc(doc, opts);
    const newBuffer = await updateDocumentXml(buffer, serializeDocx(doc));
    const docState = useDocumentStore.getState();
    const temp = await tauriCommands.saveBufferToTemp(
      Array.from(new Uint8Array(newBuffer)),
      docState.documentPath,
      null
    );
    if (temp.status !== "ok") {
      return;
    }
    const reloaded = await tauriCommands.reloadFromTemp(temp.data);
    if (reloaded.status !== "ok") {
      return;
    }
    const data = reloaded.data;
    // 重载编辑器(EditorPane 监听 documentBuffer 变化重新挂载 DocxEditor)
    docState.setDocument(
      null,
      new Uint8Array(data).buffer,
      docState.documentPath
    );
    if (docState.documentPath) {
      // 写回原文件——分栏修改即落盘
      const saved = await tauriCommands.saveDocx(docState.documentPath, data);
      if (saved.status === "ok") {
        docState.setDirty(false);
      } else {
        docState.setDirty(true);
      }
    } else {
      // 新建文档无路径:标记 dirty 提示用户另存为
      docState.setDirty(true);
    }
  } catch (e) {
    // 直改失败:标记 dirty 防止误以为已保存而丢失编辑
    useDocumentStore.getState().setDirty(true);
    console.error("设置分栏失败:", e);
  }
}
