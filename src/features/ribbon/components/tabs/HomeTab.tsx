// src/features/ribbon/components/tabs/HomeTab.tsx — 开始标签页 / Home tab
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
          testId="ribbon-undo"
        >
          ↩
        </RibbonButton>
        <RibbonButton
          label={t("menu.edit.redo")}
          onClick={execRedo}
          testId="ribbon-redo"
        >
          ↪
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 字体组 / Font group */}
      <RibbonGroup labelKey="ribbon.group.font">
        {TEXT_MARKS.map((mark) => (
          <RibbonToggleButton
            key={mark.key}
            label={t(mark.i18n)}
            onPressedChange={() => execToggleMark(mark.markName)}
            pressed={formatState.isActive(mark.markName)}
            testId={`ribbon-${mark.key}`}
          >
            <span>{t(mark.i18n)}</span>
          </RibbonToggleButton>
        ))}
        {SUPER_SUB_MARKS.map((mark) => (
          <RibbonToggleButton
            key={mark.key}
            label={t(mark.i18n)}
            onPressedChange={() => execToggleMark(mark.markName)}
            pressed={formatState.isActive(mark.markName)}
            testId={`ribbon-${mark.key}`}
          >
            <span>{t(mark.i18n)}</span>
          </RibbonToggleButton>
        ))}
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
        <input
          aria-label={t("format.textColor")}
          className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
          onChange={(e) => applyTextColor(e.target.value)}
          title={t("format.textColor")}
          type="color"
        />
        <input
          aria-label={t("format.highlight")}
          className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
          onChange={(e) => applyHighlight(e.target.value)}
          title={t("format.highlight")}
          type="color"
          value="#ffff00"
        />
      </RibbonGroup>

      <RibbonSeparator />

      {/* 段落组 / Paragraph group */}
      <RibbonGroup labelKey="ribbon.group.paragraph">
        {ALIGNMENTS.map((align) => (
          <RibbonToggleButton
            key={align.key}
            label={t(align.i18n)}
            onPressedChange={() => {
              execSetBlockType("paragraph", { alignment: align.alignment });
            }}
            pressed={formatState.isAlignActive(align.alignment)}
            testId={`ribbon-${align.key}`}
          />
        ))}
        <RibbonToggleButton
          label={t("format.orderedList")}
          onPressedChange={() =>
            listType === "ordered" ? execLift() : execWrapIn("ordered_list")
          }
          pressed={listType === "ordered"}
          testId="ribbon-orderedList"
        >
          <span>{t("format.orderedList")}</span>
        </RibbonToggleButton>
        <RibbonToggleButton
          label={t("format.unorderedList")}
          onPressedChange={() =>
            listType === "unordered" ? execLift() : execWrapIn("bullet_list")
          }
          pressed={listType === "unordered"}
          testId="ribbon-unorderedList"
        >
          <span>{t("format.unorderedList")}</span>
        </RibbonToggleButton>
        <RibbonButton
          label={t("format.indent")}
          onClick={execIndent}
          testId="ribbon-indent"
        >
          →
        </RibbonButton>
        <RibbonButton
          label={t("format.outdent")}
          onClick={execOutdent}
          testId="ribbon-outdent"
        >
          ←
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
          testId="ribbon-clearFormat"
        >
          {t("format.clearFormat")}
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
