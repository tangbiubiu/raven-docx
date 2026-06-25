// src/features/ribbon/components/FormatPainter.tsx — 格式刷 / Format Painter
// Phase 2.7: 复制当前选区 marks → 激活 → 下次选区自动应用 → 清除
// Reference: .dev/plan/2026-06-23-ribbon-enhancement.md §Phase 2

import { Paintbrush } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  execSetFontFamily,
  execSetFontFamilyEastAsia,
  execSetFontSize,
  execSetHighlight,
  execSetTextColor,
  execToggleMark,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useFormatPainterStore } from "@/stores/useFormatPainterStore";

/** 布尔 mark 字段 → mark 名称 / Boolean mark field → mark name */
const BOOL_MARKS: {
  field:
    | "bold"
    | "italic"
    | "underline"
    | "strike"
    | "superscript"
    | "subscript";
  markName: string;
}[] = [
  { field: "bold", markName: "bold" },
  { field: "italic", markName: "italic" },
  { field: "underline", markName: "underline" },
  { field: "strike", markName: "strike" },
  { field: "superscript", markName: "superscript" },
  { field: "subscript", markName: "subscript" },
];

/** 格式刷快照的 fontFamily 字段类型(与 FormatState.fontFamily 一致) */
type FontFamilySnapshot = { ascii?: string; eastAsia?: string } | null;

/** 从 selectionFormat 提取 marks 快照 / Extract marks snapshot from selectionFormat */
function snapshotMarks(fmt: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontFamily?: FontFamilySnapshot;
  fontSize?: number;
  textColor?: string;
  highlight?: string;
}) {
  return {
    bold: fmt.bold,
    italic: fmt.italic,
    underline: fmt.underline,
    strike: fmt.strike,
    superscript: fmt.superscript,
    subscript: fmt.subscript,
    fontFamily: fmt.fontFamily,
    fontSize: fmt.fontSize,
    textColor: fmt.textColor,
    highlight: fmt.highlight,
  };
}

/**
 * 应用存储的 marks 快照到当前选区 / Apply stored marks snapshot to current selection。
 * fontFamily 按 ascii/eastAsia 分别恢复(先 ascii 设西文,后 eastAsia 设中文,
 * eastAsia 命令会保留旧 ascii,故二者可共存)。
 */
function applyMarks(marks: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontFamily?: FontFamilySnapshot;
  fontSize?: number;
  textColor?: string;
  highlight?: string;
}) {
  for (const { field, markName } of BOOL_MARKS) {
    if (marks[field]) {
      execToggleMark(markName);
    }
  }
  if (marks.fontFamily) {
    // 先恢复 ascii(西文字体),再恢复 eastAsia(中文字体,保留 ascii)
    if (marks.fontFamily.ascii) {
      execSetFontFamily(marks.fontFamily.ascii);
    }
    if (marks.fontFamily.eastAsia) {
      execSetFontFamilyEastAsia(marks.fontFamily.eastAsia);
    }
  }
  if (marks.fontSize && marks.fontSize > 0) {
    execSetFontSize(marks.fontSize);
  }
  if (marks.textColor) {
    execSetTextColor(marks.textColor);
  }
  if (marks.highlight) {
    execSetHighlight(marks.highlight);
  }
}

/**
 * 格式刷按钮:点击复制当前选区 marks 并激活;
 * 激活后下次选区自动应用 marks 并清除;Esc 取消。
 */
export function FormatPainter() {
  const { t } = useT();
  const active = useFormatPainterStore((s) => s.active);
  const storedMarks = useFormatPainterStore((s) => s.marks);
  const setFormatPainter = useFormatPainterStore((s) => s.setFormatPainter);
  const clearFormatPainter = useFormatPainterStore((s) => s.clearFormatPainter);
  const selectionFormat = useDocumentStore((s) => s.selectionFormat);

  // 跟踪激活后是否已观察到一次选区变化 / Track post-activation selection change
  const armedRef = useRef(false);

  // 激活时 arm,等待下次选区变化 / Arm on activation, await next selection change
  useEffect(() => {
    if (active) {
      armedRef.current = true;
    } else {
      armedRef.current = false;
    }
  }, [active]);

  // 选区变化时,若已激活且已 arm(跳过激活当次的选区),应用 marks 并清除
  useEffect(() => {
    if (!(active && storedMarks && armedRef.current)) {
      return;
    }
    // 跳过激活瞬间的同一选区 / Skip the same selection at activation moment
    if (!selectionFormat) {
      return;
    }
    applyMarks(storedMarks);
    clearFormatPainter();
  }, [active, storedMarks, selectionFormat, clearFormatPainter]);

  const handleClick = () => {
    if (active) {
      clearFormatPainter();
    } else if (selectionFormat) {
      setFormatPainter(snapshotMarks(selectionFormat));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && active) {
      e.preventDefault();
      clearFormatPainter();
    }
  };

  return (
    <button
      aria-label={t("format.formatPainter")}
      aria-pressed={active}
      className={cn(
        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded px-2 text-xs",
        "transition duration-150",
        "hover:scale-105 hover:bg-accent hover:text-accent-foreground",
        "active:scale-95",
        active ? "bg-accent text-accent-foreground" : ""
      )}
      data-pressed={active}
      data-testid="ribbon-formatPainter"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={t("format.formatPainter")}
      type="button"
    >
      <Paintbrush className="size-4" />
    </button>
  );
}
