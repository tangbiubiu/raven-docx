import type { Alignment } from "@/features/formatting/constants";
// src/features/ribbon/components/RibbonFormatButtons.tsx — 细粒度订阅的格式切换按钮 / Fine-grained format toggle buttons
// Phase 7.1: 每个按钮只订阅自己所需的 selectionFormat 字段，React Compiler 自动 memo 组件实例。
// 替代 HomeTab 内联 useFormatState().isActive() 调用（该路径不响应选区变化）。

import type { ReactNode } from "react";
import { execToggleMark } from "@/features/editor/commands";
import { FONT_FAMILIES } from "@/features/formatting/constants";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { RibbonToggleButton } from "./RibbonToggleButton";

/** selectionFormat 上布尔 mark 字段名 */
type MarkField =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "superscript"
  | "subscript";

/**
 * 单个 mark 切换按钮 — 只订阅 `selectionFormat[field]`。
 * 选区变化时仅该字段变化的按钮重渲染。
 */
export function MarkToggleButton({
  field,
  markName,
  label,
  testId,
  shortcut,
  children,
}: {
  field: MarkField;
  markName: string;
  label: string;
  testId: string;
  shortcut?: string;
  children?: ReactNode;
}) {
  const pressed = useDocumentStore((s) => s.selectionFormat?.[field] ?? false);
  return (
    <RibbonToggleButton
      label={label}
      onPressedChange={() => execToggleMark(markName)}
      pressed={pressed}
      shortcut={shortcut}
      testId={testId}
    >
      {children}
    </RibbonToggleButton>
  );
}

/**
 * 对齐切换按钮 — 只订阅 `selectionFormat.alignment`。
 */
export function AlignToggleButton({
  alignment,
  label,
  testId,
  onToggle,
  shortcut,
  children,
}: {
  alignment: Alignment;
  label: string;
  testId: string;
  onToggle: () => void;
  shortcut?: string;
  children?: ReactNode;
}) {
  const current = useDocumentStore(
    (s) => s.selectionFormat?.alignment ?? "left"
  );
  return (
    <RibbonToggleButton
      label={label}
      onPressedChange={onToggle}
      pressed={current === alignment}
      shortcut={shortcut}
      testId={testId}
    >
      {children}
    </RibbonToggleButton>
  );
}

/**
 * 列表切换按钮 — 只订阅 `selectionFormat.listType`。
 * onToggle 收到当前是否已按下，调用方据此决定 lift（已按下）还是 wrap（未按下）。
 */
export function ListToggleButton({
  listType,
  label,
  testId,
  onToggle,
  shortcut,
  children,
}: {
  listType: "ordered" | "unordered";
  label: string;
  testId: string;
  onToggle: (pressed: boolean) => void;
  shortcut?: string;
  children?: ReactNode;
}) {
  const current = useDocumentStore((s) => s.selectionFormat?.listType ?? null);
  const pressed = current === listType;
  return (
    <RibbonToggleButton
      label={label}
      onPressedChange={() => onToggle(pressed)}
      pressed={pressed}
      shortcut={shortcut}
      testId={testId}
    >
      {children}
    </RibbonToggleButton>
  );
}
/**
 * 字体回显值 hook — 从 selectionFormat.fontFamily 对象提取显示字符串。
 *
 * 回显策略(§3.1 精确 + 混合为空):
 * - null(混合选区) → ""(回显空)
 * - {}(选区文本节点均无 fontFamily mark) → ""(回显空)
 * - {eastAsia: "SimSun"} → "宋体"(中文优先,查 FONT_FAMILIES 友好名)
 * - {ascii: "Calibri"} → "Calibri"(西文,label 即原名)
 * - {eastAsia: "SimSun", ascii: "Calibri"} → "宋体"(中文优先)
 * - 非清单字体名 → 直接显示原始名
 *
 * 返回友好显示名(非 Select value),供 FontCombobox 显示。
 */
export function useFontFamilyValue(): string {
  const fontFamily = useDocumentStore(
    (s) => s.selectionFormat?.fontFamily ?? null
  );
  if (!fontFamily) {
    return "";
  }
  // eastAsia 优先(中文用户场景下 eastAsia 是视觉主导字体)
  const raw = fontFamily.eastAsia || fontFamily.ascii || "";
  if (!raw) {
    return "";
  }
  // 查 FONT_FAMILIES 做 OOXML 名→友好名映射(大小写不敏感)
  const item = FONT_FAMILIES.find(
    (f) => f.font.toLowerCase() === raw.toLowerCase()
  );
  return item?.label ?? raw;
}

/** 受控字号 Select 的当前值 hook（半磅 → pt 显示，细粒度订阅）*/
export function useFontSizeValue(): string {
  return useDocumentStore((s) => {
    const halfPt = s.selectionFormat?.fontSize;
    return halfPt && halfPt > 0 ? String(halfPt) : "";
  });
}

/** 当前标题级别 hook（headingLevel → Select value，细粒度订阅）*/
export function useHeadingValue(): string {
  return useDocumentStore((s) => {
    const level = s.selectionFormat?.headingLevel;
    return level ? `heading${level}` : "paragraph";
  });
}
