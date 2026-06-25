// src/features/ribbon/components/tabs/HomeTab.tsx — 开始标签页 / Home tab

// Phase 7.1: 切换按钮改用细粒度 store 订阅（RibbonFormatButtons），
// 替代 useFormatState() 直接读 PM view（不响应选区变化）。
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  Redo,
  Search,
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
  execUndo,
  execWrapIn,
} from "@/features/editor/commands";
import {
  ALIGNMENTS,
  FONT_SIZES,
  HEADING_OPTIONS,
  SUPER_SUB_MARKS,
  TEXT_MARKS,
} from "@/features/formatting/constants";
import {
  applyFontSize,
  applyHighlight,
  applyTextColor,
  clearFormatting,
} from "@/features/formatting/format-apply";
import { useFormatState } from "@/features/formatting/hooks/use-format-state";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import { ColorPicker } from "../ColorPicker";
import { FontCombobox } from "../FontCombobox";
import { FormatPainter } from "../FormatPainter";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import {
  AlignToggleButton,
  ListToggleButton,
  MarkToggleButton,
  useFontSizeValue,
  useHeadingValue,
} from "../RibbonFormatButtons";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

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
  const fontSizeValue = useFontSizeValue();
  const headingValue = useHeadingValue();
  // 文字颜色/高亮的响应式回显值 / Reactive text color / highlight echo values
  const { textColor, highlight } = useFormatState();
  const openModal = useAppStore((s) => s.openModal);

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
            <MarkToggleButton
              field={mark.key as "bold" | "italic" | "underline" | "strike"}
              key={mark.key}
              label={t(mark.i18n)}
              markName={mark.markName}
              shortcut={MARK_SHORTCUTS[mark.key]}
              testId={`ribbon-${mark.key}`}
            >
              <Icon className="size-4" />
            </MarkToggleButton>
          );
        })}
        {SUPER_SUB_MARKS.map((mark) => {
          const Icon = MARK_ICONS[mark.key] ?? Superscript;
          return (
            <MarkToggleButton
              field={mark.key as "superscript" | "subscript"}
              key={mark.key}
              label={t(mark.i18n)}
              markName={mark.markName}
              testId={`ribbon-${mark.key}`}
            >
              <Icon className="size-4" />
            </MarkToggleButton>
          );
        })}
        <FontCombobox />
        <Select
          onValueChange={(v) => applyFontSize(Number.parseInt(v, 10) * 2)}
          value={fontSizeValue ?? ""}
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
        <ColorPicker
          label={t("format.textColor")}
          onChange={applyTextColor}
          testId="ribbon-textColor"
          value={textColor}
        />
        <ColorPicker
          label={t("format.highlight")}
          onChange={applyHighlight}
          testId="ribbon-highlight"
          value={highlight}
        />
        {/* 格式刷 / Format painter */}
        <FormatPainter />
      </RibbonGroup>

      <RibbonSeparator />

      {/* 段落组 / Paragraph group */}
      <RibbonGroup labelKey="ribbon.group.paragraph">
        {ALIGNMENTS.map((align) => {
          const Icon = ALIGN_ICONS[align.alignment] ?? AlignLeft;
          return (
            <AlignToggleButton
              alignment={
                align.alignment as "left" | "center" | "right" | "justify"
              }
              key={align.key}
              label={t(align.i18n)}
              onToggle={() =>
                execSetBlockType("paragraph", { alignment: align.alignment })
              }
              testId={`ribbon-${align.key}`}
            >
              <Icon className="size-4" />
            </AlignToggleButton>
          );
        })}
        <ListToggleButton
          label={t("format.orderedList")}
          listType="ordered"
          onToggle={(pressed) =>
            pressed ? execLift() : execWrapIn("ordered_list")
          }
          shortcut="⌘⇧7"
          testId="ribbon-orderedList"
        >
          <ListOrdered className="size-4" />
        </ListToggleButton>
        <ListToggleButton
          label={t("format.unorderedList")}
          listType="unordered"
          onToggle={(pressed) =>
            pressed ? execLift() : execWrapIn("bullet_list")
          }
          shortcut="⌘⇧8"
          testId="ribbon-unorderedList"
        >
          <List className="size-4" />
        </ListToggleButton>
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
          value={headingValue}
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
        <RibbonButton
          label={t("format.find")}
          onClick={() => openModal("findReplace")}
          shortcut="⌘F"
          testId="ribbon-find"
        >
          <Search className="size-5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
