// editor/commands/formatting.ts — 文本格式:marks、字体/字号/颜色/高亮、链接
// 基于 docx-editor-core PM 命令的 exec* 纯函数封装。

import {
  clearFontFamily,
  clearFontSize,
  clearHighlight,
  clearTextColor,
  createRemoveMarkCommand,
  createSetMarkCommand,
  setFontFamily,
  setFontSize,
  setHighlight,
  setTextColor,
} from "@eigenpal/docx-editor-core/prosemirror/commands";
import { toggleMark } from "prosemirror-commands";
import { apply, getView } from "./shared";

// === Mark 操作 ===

/** 切换文本标记（bold/italic/underline/strike/superscript/subscript 等） */
export function execToggleMark(markName: string): void {
  const view = getView();
  if (!view) {
    return;
  }
  const mark = view.state.schema.marks[markName];
  if (!mark) {
    return;
  }
  toggleMark(mark)(view.state, view.dispatch);
}

/**
 * 设置文本标记(设值语义,非 toggle)/ Set a mark (set-semantics, not toggle).
 * 用于格式刷:源加粗则目标必加粗。
 */
export function execSetMark(
  markName: string,
  attrs?: Record<string, unknown>
): void {
  const view = getView();
  if (!view) {
    return;
  }
  const markType = view.state.schema.marks[markName];
  if (!markType) {
    return;
  }
  apply(createSetMarkCommand(markType, attrs));
}

/**
 * 移除文本标记(清除语义)/ Remove a mark (clear-semantics).
 * 用于格式刷:源未加粗则目标必不加粗。
 */
export function execRemoveMark(markName: string): void {
  const view = getView();
  if (!view) {
    return;
  }
  const markType = view.state.schema.marks[markName];
  if (!markType) {
    return;
  }
  apply(createRemoveMarkCommand(markType));
}

/** 清除字体族 / Clear font family */
export function execClearFontFamily(): void {
  apply(clearFontFamily);
}

/** 清除字号 / Clear font size */
export function execClearFontSize(): void {
  apply(clearFontSize);
}

/** 清除文字颜色 / Clear text color */
export function execClearTextColor(): void {
  apply(clearTextColor);
}

/** 清除文本高亮 / Clear text highlight */
export function execClearHighlight(): void {
  apply(clearHighlight);
}

// === 字体/字号/颜色/高亮(基于 docx-editor-core PM 命令)===

/** 设置字体族(ascii + hAnsi 同步设置)/ Set font family */
export function execSetFontFamily(fontName: string): void {
  apply(setFontFamily(fontName));
}

/**
 * 设置 CJK 字体族(三字段同设)/ Set CJK font family (co-set ascii+hAnsi+eastAsia).
 *
 * 库 setFontFamily 只设 ascii+hAnsi;布局层 vt()/toDOM 只读 ascii||hAnsi,
 * 仅设 eastAsia 无法渲染。故 CJK 字体名同时写入三字段,确保:
 * - 渲染层(读 ascii)拿到 CJK 字体名 → @font-face local() 命中系统字体
 * - OOXML 序列化 eastAsia 字段正确(跨平台 Word 兼容)
 *
 * 实现委托 execSetFontFamilyComplete:三字段同设 = 覆盖全部字段(无保留)。
 */
export function execSetFontFamilyEastAsia(fontName: string): void {
  execSetFontFamilyComplete({
    ascii: fontName,
    hAnsi: fontName,
    eastAsia: fontName,
  });
}

/**
 * 合并设置字体族(只覆盖传入字段)/ Merge-set font family (overwrite only provided fields).
 *
 * 与 execSetFontFamilyEastAsia(三字段同设)不同:本函数用 `{ ...oldAttrs, ...attrs }`
 * 仅覆盖传入字段,保留其他字段。用于格式刷:源只设 ascii 时,目标 eastAsia 应保留;
 * 源设 ascii+hAnsi+eastAsia 三字段时,全部覆盖。
 *
 * 调用方负责构造 attrs,hAnsi 由 ascii 派生(与库 setFontFamily 语义一致)。
 * 逐节点读取旧 attrs 合并后 addMark(addMark 替换整个 mark 而非合并 attrs)。
 * 光标(空选区)用 storedMarks 设定。
 */
export function execSetFontFamilyComplete(attrs: {
  ascii?: string;
  hAnsi?: string;
  eastAsia?: string;
}): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { state, dispatch: viewDispatch } = view;
  const { from, to, empty } = state.selection;
  const markType = state.schema.marks.fontFamily;
  if (!markType) {
    return;
  }

  if (empty) {
    // 光标处:合并进 storedMarks(只覆盖传入字段)
    const existing = state.storedMarks?.find((m) => m.type === markType);
    const mergedAttrs = { ...(existing?.attrs ?? {}), ...attrs };
    const mark = markType.create(mergedAttrs);
    const nextStored = [
      ...(state.storedMarks?.filter((m) => m.type !== markType) ?? []),
      mark,
    ];
    viewDispatch(state.tr.setStoredMarks(nextStored));
    return;
  }

  // 选区:先移除旧 mark,再逐节点读取旧 attrs 合并传入字段后重新 addMark
  let tr = state.tr.removeMark(from, to, markType);

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) {
      return;
    }
    const oldMark = node.marks.find((m) => m.type === markType);
    const mergedAttrs = { ...(oldMark?.attrs ?? {}), ...attrs };
    const mergedMark = markType.create(mergedAttrs);
    const nodeFrom = Math.max(pos, from);
    const nodeTo = Math.min(pos + node.nodeSize, to);
    if (nodeFrom < nodeTo) {
      tr = tr.addMark(nodeFrom, nodeTo, mergedMark);
    }
  });

  viewDispatch(tr);
}

/** 设置字号(half-points,OOXML w:sz 刻度,24 = 12pt)/ Set font size */
export function execSetFontSize(sizeHalfPt: number): void {
  apply(setFontSize(sizeHalfPt));
}

/** 设置文字颜色(rgb 不带 # 前缀,自动剥离)/ Set text color */
export function execSetTextColor(rgb: string): void {
  const normalized = rgb.replace("#", "");
  apply(setTextColor({ rgb: normalized }));
}

/** 设置文本高亮(颜色名,如 'yellow')/ Set text highlight */
export function execSetHighlight(color: string): void {
  apply(setHighlight(color));
}

// === 链接 ===

/** 插入链接 */
export function execInsertLink(url = ""): void {
  const view = getView();
  if (!view) {
    return;
  }
  const href = url || "https://";
  const { from } = view.state.selection;
  const linkMark = view.state.schema.marks.link;
  if (linkMark) {
    const tr = view.state.tr
      .insertText(href, from)
      .addMark(from, from + href.length, linkMark.create({ href }));
    view.dispatch(tr);
  } else {
    view.dispatch(view.state.tr.insertText(`[链接](${href})`));
  }
}
