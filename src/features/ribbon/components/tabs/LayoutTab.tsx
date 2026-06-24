// src/features/ribbon/components/tabs/LayoutTab.tsx — 布局标签页 / Layout tab
// Phase 3: 行距 / 段落间距 / 缩进控制 / line spacing, paragraph spacing, indent

import { Columns, Indent, LayoutTemplate, Outdent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  execIndent,
  execOutdent,
  execSetIndentation,
  execSetLineSpacing,
  execSetParagraphSpacing,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

// === 常量 / Constants ===

/** 行距倍数(字符串以稳定 i18n key:1.0 而非 1)/ Line spacing multiples */
const LINE_SPACING_VALUES = ["1.0", "1.15", "1.5", "2.0"] as const;

/** 段前/段后预设(pt)/ Paragraph spacing presets (pt) */
const SPACING_PT_VALUES = [0, 6, 12, 18, 24] as const;

/** 左/右缩进预设(twips,1cm ≈ 567 twips)/ Indent presets (twips) */
const INDENT_TWIPS_VALUES = [0, 567, 1134, 1701, 2268] as const;

/** 首行缩进预设(字符,1 字符 ≈ 240 twips ≈ 12pt)/ First-line indent presets (chars) */
const FIRST_LINE_CHARS = [0, 2, 4] as const;
const TWIPS_PER_CHAR = 240;

/** pt → twips 转换(1pt = 20 twips)/ pt to twips */
const ptToTwips = (pt: number): number => pt * 20;

export function LayoutTab({ onPageSetup, onHeaderFooter }: RibbonCallbacks) {
  const { t } = useT();
  return (
    <>
      <RibbonGroup labelKey="ribbon.group.pageSetup">
        <RibbonButton
          label={t("pageSetup.title")}
          onClick={onPageSetup}
          testId="ribbon-pageSetup"
        >
          <LayoutTemplate className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.headerFooter">
        <RibbonButton
          label={t("headerFooter.title")}
          onClick={onHeaderFooter}
          testId="ribbon-headerFooter"
        >
          <Columns className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.lineSpacing">
        <span className="contents" data-testid="ribbon-lineSpacing">
          <Select
            onValueChange={(v) => execSetLineSpacing(Number.parseFloat(v))}
          >
            <SelectTrigger className="h-7 w-[70px] text-xs" size="sm">
              <SelectValue placeholder={t("format.lineSpacing")} />
            </SelectTrigger>
            <SelectContent>
              {LINE_SPACING_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`format.lineSpacing.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.paragraphSpacing">
        {/* 段前 / Space before */}
        <span className="contents" data-testid="ribbon-spaceBefore">
          <Select
            onValueChange={(v) =>
              execSetParagraphSpacing(ptToTwips(Number.parseInt(v, 10)), 0)
            }
          >
            <SelectTrigger className="h-7 w-[64px] text-xs" size="sm">
              <SelectValue placeholder={t("format.spaceBefore")} />
            </SelectTrigger>
            <SelectContent>
              {SPACING_PT_VALUES.map((pt) => (
                <SelectItem key={pt} value={String(pt)}>
                  {t(`format.spaceBefore.${pt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
        {/* 段后 / Space after */}
        <span className="contents" data-testid="ribbon-spaceAfter">
          <Select
            onValueChange={(v) =>
              execSetParagraphSpacing(0, ptToTwips(Number.parseInt(v, 10)))
            }
          >
            <SelectTrigger className="h-7 w-[64px] text-xs" size="sm">
              <SelectValue placeholder={t("format.spaceAfter")} />
            </SelectTrigger>
            <SelectContent>
              {SPACING_PT_VALUES.map((pt) => (
                <SelectItem key={pt} value={String(pt)}>
                  {t(`format.spaceAfter.${pt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.indent">
        <RibbonButton
          label={t("format.indent")}
          onClick={execIndent}
          testId="ribbon-indent"
        >
          <Indent className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("format.outdent")}
          onClick={execOutdent}
          testId="ribbon-outdent"
        >
          <Outdent className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.indentValue">
        {/* 左缩进 / Left indent */}
        <span className="contents" data-testid="ribbon-indentLeft">
          <Select
            onValueChange={(v) =>
              execSetIndentation({ left: Number.parseInt(v, 10) })
            }
          >
            <SelectTrigger className="h-7 w-[64px] text-xs" size="sm">
              <SelectValue placeholder={t("format.indentLeft")} />
            </SelectTrigger>
            <SelectContent>
              {INDENT_TWIPS_VALUES.map((tw) => (
                <SelectItem key={tw} value={String(tw)}>
                  {t("format.indentLeft")} {(tw / 567).toFixed(1)}cm
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
        {/* 右缩进 / Right indent */}
        <span className="contents" data-testid="ribbon-indentRight">
          <Select
            onValueChange={(v) =>
              execSetIndentation({ right: Number.parseInt(v, 10) })
            }
          >
            <SelectTrigger className="h-7 w-[64px] text-xs" size="sm">
              <SelectValue placeholder={t("format.indentRight")} />
            </SelectTrigger>
            <SelectContent>
              {INDENT_TWIPS_VALUES.map((tw) => (
                <SelectItem key={tw} value={String(tw)}>
                  {t("format.indentRight")} {(tw / 567).toFixed(1)}cm
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
        {/* 首行缩进 / First-line indent */}
        <span className="contents" data-testid="ribbon-firstLineIndent">
          <Select
            onValueChange={(v) =>
              execSetIndentation({
                firstLine: Number.parseInt(v, 10) * TWIPS_PER_CHAR,
              })
            }
          >
            <SelectTrigger className="h-7 w-[80px] text-xs" size="sm">
              <SelectValue placeholder={t("format.firstLineIndent")} />
            </SelectTrigger>
            <SelectContent>
              {FIRST_LINE_CHARS.map((ch) => (
                <SelectItem key={ch} value={String(ch)}>
                  {t(`format.firstLineIndent.${ch}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </RibbonGroup>
    </>
  );
}
