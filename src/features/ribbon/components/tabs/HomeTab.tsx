// src/features/ribbon/components/tabs/HomeTab.tsx — 开始标签页 / Home tab

import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  Palette,
  Redo,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  execIndent,
  execLift,
  execOutdent,
  execRedo,
  execSetBlockType,
  execToggleMark,
  execUndo,
  execWrapIn,
} from "@/features/editor/commands";
import {
  ALIGNMENTS,
  FONT_FAMILIES,
  FONT_SIZES,
  HEADING_OPTIONS,
  SUPER_SUB_MARKS,
  TEXT_MARKS,
} from "@/features/formatting/constants";
import {
  applyFont,
  applyFontSize,
  applyHighlight,
  applyTextColor,
  clearFormatting,
} from "@/features/formatting/format-apply";
import { useFormatState } from "@/features/formatting/hooks/use-format-state";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";
import { RibbonToggleButton } from "../RibbonToggleButton";

/** 文本标记 → lucide 图标映射 / text mark → lucide icon */
const MARK_ICONS: Record<string, LucideIcon> = {
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strikethrough: Strikethrough,
  superscript: Superscript,
  subscript: Subscript,
};

/** 对齐 → lucide 图标映射 / alignment → lucide icon */
const ALIGN_ICONS: Record<string, LucideIcon> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

/** 文本标记快捷键 / text mark shortcuts */
const MARK_SHORTCUTS: Record<string, string> = {
  bold: "⌘B",
  italic: "⌘I",
  underline: "⌘U",
  strikethrough: "⌘⇧S",
};

export function HomeTab(_props: RibbonCallbacks) {
  const { t } = useT();
  const formatState = useFormatState();
  const listType = formatState.getListType();

  const headingValue = () => {
    const level = formatState.getHeadingLevel();
    return level ? `heading${level}` : "paragraph";
  };

  return (
    <>
      {/* 撤销组 / Undo group */}
      <RibbonGroup labelKey="ribbon.group.undo">
        <RibbonButton
          label={t("menu.edit.undo")}
          onClick={execUndo}
          shortcut="⌘Z"
          testId="ribbon-undo"
        >
          <Undo className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("menu.edit.redo")}
          onClick={execRedo}
          shortcut="⌘⇧Z"
          testId="ribbon-redo"
        >
          <Redo className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 字体组 / Font group */}
      <RibbonGroup labelKey="ribbon.group.font">
        {TEXT_MARKS.map((mark) => {
          const Icon = MARK_ICONS[mark.key] ?? Bold;
          return (
            <RibbonToggleButton
              key={mark.key}
              label={t(mark.i18n)}
              onPressedChange={() => execToggleMark(mark.markName)}
              pressed={formatState.isActive(mark.markName)}
              shortcut={MARK_SHORTCUTS[mark.key]}
              testId={`ribbon-${mark.key}`}
            >
              <Icon className="size-4" />
            </RibbonToggleButton>
          );
        })}
        {SUPER_SUB_MARKS.map((mark) => {
          const Icon = MARK_ICONS[mark.key] ?? Superscript;
          return (
            <RibbonToggleButton
              key={mark.key}
              label={t(mark.i18n)}
              onPressedChange={() => execToggleMark(mark.markName)}
              pressed={formatState.isActive(mark.markName)}
              testId={`ribbon-${mark.key}`}
            >
              <Icon className="size-4" />
            </RibbonToggleButton>
          );
        })}
        <Select onValueChange={applyFont}>
          <SelectTrigger className="h-7 w-[90px] text-xs" size="sm">
            <SelectValue placeholder={t("format.font")} />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(v) => applyFontSize(Number.parseInt(v, 10) * 2)}
        >
          <SelectTrigger className="h-7 w-[60px] text-xs" size="sm">
            <SelectValue placeholder={t("format.fontSize")} />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label
          className="relative inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-accent"
          title={t("format.textColor")}
        >
          <Palette className="pointer-events-none size-4 text-muted-foreground" />
          <input
            aria-label={t("format.textColor")}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => applyTextColor(e.target.value)}
            type="color"
          />
        </label>
        <label
          className="relative inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-accent"
          title={t("format.highlight")}
        >
          <Highlighter className="pointer-events-none size-4 text-muted-foreground" />
          <input
            aria-label={t("format.highlight")}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => applyHighlight(e.target.value)}
            type="color"
            value="#ffff00"
          />
        </label>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 段落组 / Paragraph group */}
      <RibbonGroup labelKey="ribbon.group.paragraph">
        {ALIGNMENTS.map((align) => {
          const Icon = ALIGN_ICONS[align.alignment] ?? AlignLeft;
          return (
            <RibbonToggleButton
              key={align.key}
              label={t(align.i18n)}
              onPressedChange={() => {
                execSetBlockType("paragraph", { alignment: align.alignment });
              }}
              pressed={formatState.isAlignActive(align.alignment)}
              testId={`ribbon-${align.key}`}
            >
              <Icon className="size-4" />
            </RibbonToggleButton>
          );
        })}
        <RibbonToggleButton
          label={t("format.orderedList")}
          onPressedChange={() =>
            listType === "ordered" ? execLift() : execWrapIn("ordered_list")
          }
          pressed={listType === "ordered"}
          shortcut="⌘⇧7"
          testId="ribbon-orderedList"
        >
          <ListOrdered className="size-4" />
        </RibbonToggleButton>
        <RibbonToggleButton
          label={t("format.unorderedList")}
          onPressedChange={() =>
            listType === "unordered" ? execLift() : execWrapIn("bullet_list")
          }
          pressed={listType === "unordered"}
          shortcut="⌘⇧8"
          testId="ribbon-unorderedList"
        >
          <List className="size-4" />
        </RibbonToggleButton>
        <RibbonButton
          label={t("format.indent")}
          onClick={execIndent}
          shortcut="⌘]"
          testId="ribbon-indent"
        >
          <Indent className="size-4" />
        </RibbonButton>
        <RibbonButton
          label={t("format.outdent")}
          onClick={execOutdent}
          shortcut="⌘["
          testId="ribbon-outdent"
        >
          <Outdent className="size-4" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 样式组 / Styles group */}
      <RibbonGroup labelKey="ribbon.group.styles">
        <Select
          onValueChange={(v) => {
            if (v === "paragraph") {
              execSetBlockType("paragraph");
            } else {
              const level = Number.parseInt(v.replace("heading", ""), 10);
              execSetBlockType("heading", { level });
            }
          }}
          value={headingValue()}
        >
          <SelectTrigger className="h-7 w-[80px] text-xs" size="sm">
            <SelectValue placeholder={t("format.normal")} />
          </SelectTrigger>
          <SelectContent>
            {HEADING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.i18n)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 编辑组 / Editing group */}
      <RibbonGroup labelKey="ribbon.group.editing">
        <RibbonButton
          label={t("format.clearFormat")}
          onClick={clearFormatting}
          shortcut="⌘\\"
          testId="ribbon-clearFormat"
        >
          <Eraser className="size-5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
