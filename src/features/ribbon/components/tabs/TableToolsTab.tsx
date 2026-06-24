// src/features/ribbon/components/tabs/TableToolsTab.tsx — 表格工具上下文标签页 / Table Tools contextual tab
// Phase 4: 选中表格时出现的专属标签页
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Grid3x3,
  PaintBucket,
  Rows3,
  TableCellsMerge,
  TableCellsSplit,
} from "lucide-react";
import { useState } from "react";
import {
  execApplyTableStyle,
  execMergeCells,
  execSetCellBorder,
  execSetCellFillColor,
  execSetCellVerticalAlign,
  execSetRowHeight,
  execSplitCell,
  execToggleHeaderRow,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

/** 表格样式预设 / Table style presets */
const TABLE_STYLES = [
  { id: "TableGrid", labelKey: "ribbon.table.style.grid" },
  { id: "LightShading", labelKey: "ribbon.table.style.lightShading" },
  { id: "LightList", labelKey: "ribbon.table.style.lightList" },
  { id: "MediumShading1", labelKey: "ribbon.table.style.mediumShading1" },
];

/** 垂直对齐选项 / Vertical align options */
const V_ALIGN_OPTIONS = [
  {
    value: "top",
    labelKey: "ribbon.table.vAlign.top",
    Icon: AlignVerticalJustifyStart,
  },
  {
    value: "center",
    labelKey: "ribbon.table.vAlign.center",
    Icon: AlignVerticalJustifyCenter,
  },
  {
    value: "bottom",
    labelKey: "ribbon.table.vAlign.bottom",
    Icon: AlignVerticalJustifyEnd,
  },
] as const;

export function TableToolsTab(_props: RibbonCallbacks) {
  const { t } = useT();
  const [fillColor, setFillColor] = useState("#ffffff");
  const [rowHeight, setRowHeight] = useState("");

  const handleFillColor = (value: string) => {
    setFillColor(value);
    execSetCellFillColor(value || null);
  };

  const handleRowHeight = (value: string) => {
    setRowHeight(value);
    const num = Number(value);
    if (value && !Number.isNaN(num)) {
      execSetRowHeight(num);
    }
  };

  const handleBorderStyle = () => {
    execSetCellBorder("all", {
      style: "single",
      size: 4,
      color: { rgb: "000000" },
    });
  };

  const handleTableStyle = (styleId: string) => {
    execApplyTableStyle({ styleId });
  };

  return (
    <>
      {/* 表格样式 / Table style */}
      <RibbonGroup labelKey="ribbon.group.tableStyle">
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <span className="text-[10px] text-muted-foreground">
            {t("ribbon.table.style")}
          </span>
          <select
            className="h-7 rounded border border-border px-1 text-xs"
            data-testid="ribbon-tableStyle"
            defaultValue=""
            onChange={(e) => handleTableStyle(e.target.value)}
          >
            <option disabled value="">
              {t("ribbon.table.style.select")}
            </option>
            {TABLE_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 边框 / Borders */}
      <RibbonGroup labelKey="ribbon.group.borders">
        <RibbonButton
          label={t("ribbon.table.border")}
          onClick={handleBorderStyle}
          testId="ribbon-cellBorder"
        >
          <Grid3x3 className="size-5" />
        </RibbonButton>
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <PaintBucket className="size-4" />
          <input
            className="h-5 w-10 rounded border border-border px-0.5 text-[10px]"
            data-testid="ribbon-cellFillColor"
            onChange={(e) => handleFillColor(e.target.value)}
            type="color"
            value={fillColor}
          />
        </label>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 合并/拆分 / Merge & split */}
      <RibbonGroup labelKey="ribbon.group.mergeSplit">
        <RibbonButton
          label={t("ribbon.table.mergeCells")}
          onClick={execMergeCells}
          testId="ribbon-mergeCells"
        >
          <TableCellsMerge className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.table.splitCell")}
          onClick={execSplitCell}
          testId="ribbon-splitCell"
        >
          <TableCellsSplit className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.table.headerRow")}
          onClick={execToggleHeaderRow}
          testId="ribbon-toggleHeaderRow"
        >
          <Rows3 className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 对齐(垂直)/ Alignment (vertical) */}
      <RibbonGroup labelKey="ribbon.group.alignment">
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <span className="text-[10px] text-muted-foreground">
            {t("ribbon.table.vAlign")}
          </span>
          <select
            className="h-7 rounded border border-border px-1 text-xs"
            data-testid="ribbon-cellVAlign"
            defaultValue=""
            onChange={(e) =>
              execSetCellVerticalAlign(
                e.target.value as "top" | "center" | "bottom"
              )
            }
          >
            <option disabled value="">
              {t("ribbon.table.vAlign.select")}
            </option>
            {V_ALIGN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 行高/列宽 / Row height & column width */}
      <RibbonGroup labelKey="ribbon.group.cellSize">
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <span className="text-[10px] text-muted-foreground">
            {t("ribbon.table.rowHeight")}
          </span>
          <input
            className="h-7 w-14 rounded border border-border px-1 text-xs"
            data-testid="ribbon-rowHeight"
            inputMode="numeric"
            onChange={(e) => handleRowHeight(e.target.value)}
            placeholder="0"
            type="number"
            value={rowHeight}
          />
        </label>
      </RibbonGroup>
    </>
  );
}
