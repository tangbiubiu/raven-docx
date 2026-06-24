// src/features/ribbon/components/RibbonFormatButtons.tsx — 细粒度订阅的格式切换按钮 / Fine-grained format toggle buttons
// Phase 7.1: 每个按钮只订阅自己所需的 selectionFormat 字段，React Compiler 自动 memo 组件实例。
// 替代 HomeTab 内联 useFormatState().isActive() 调用（该路径不响应选区变化）。

import type { ReactNode } from "react";
import { execToggleMark } from "@/features/editor/commands";
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
  alignment: "left" | "center" | "right" | "justify";
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

/** 受控字体 Select 的当前值 hook（细粒度订阅）*/
export function useFontFamilyValue(): string {
  return useDocumentStore((s) => s.selectionFormat?.fontFamily ?? "");
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
