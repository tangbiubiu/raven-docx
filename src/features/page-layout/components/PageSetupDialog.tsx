// features/page-layout/components/PageSetupDialog.tsx — 页面设置对话框 (Page Setup Dialog)
// 页边距、纸张大小、纸张方向设置
// Reference: .dev/plan/phase4-branch-plan.md §2.2a · FRS F-100~102
//
// ⚠️ 原型中无此 Dialog 的设计稿。参照 Word / Pages 的页面设置面板自行设计。

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { usePageSetup } from "../hooks/usePageSetup";
import {
  identifyPaperPreset,
  MARGIN_PRESETS,
  type Margins,
  MM_TO_TWIPS,
  type Orientation,
  PAPER_PRESETS,
  type PaperSize,
} from "../types";

const PAPER_OPTIONS = ["A4", "Letter", "Legal", "B5"] as const;
const MARGIN_OPTIONS = ["normal", "narrow", "moderate", "wide"] as const;
const ORIENTATION_OPTIONS = ["portrait", "landscape"] as const;

/** twips → mm，保留 1 位小数 */
function twipsToMm(twips: number): number {
  return Math.round((twips / MM_TO_TWIPS) * 10) / 10;
}

/** mm → twips */
function mmToTwips(mm: number): number {
  return Math.round(mm * MM_TO_TWIPS);
}
/** 识别当前边距对应的预设 — 模块级纯函数,无闭包状态,引用稳定 */
function identifyPresetFromLayout(margins: Margins): string {
  const threshold = 2; // mm tolerance
  for (const key of MARGIN_OPTIONS) {
    const p = MARGIN_PRESETS[key];
    if (
      Math.abs(twipsToMm(p.top) - twipsToMm(margins.top)) < threshold &&
      Math.abs(twipsToMm(p.right) - twipsToMm(margins.right)) < threshold &&
      Math.abs(twipsToMm(p.bottom) - twipsToMm(margins.bottom)) < threshold &&
      Math.abs(twipsToMm(p.left) - twipsToMm(margins.left)) < threshold
    ) {
      return key;
    }
  }
  return "custom";
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PageSetupDialog({ open, onClose }: Props) {
  const { t } = useT();
  const {
    getCurrentLayout,
    setMargins,
    setPageSize,
    setOrientation,
    applyMarginPreset,
    applyPaperPreset,
  } = usePageSetup();

  // 初始化表单状态
  const initLayout = useCallback(() => {
    const layout = getCurrentLayout();
    return {
      marginTop: twipsToMm(layout.margins.top),
      marginBottom: twipsToMm(layout.margins.bottom),
      marginLeft: twipsToMm(layout.margins.left),
      marginRight: twipsToMm(layout.margins.right),
      marginPreset: identifyPresetFromLayout(layout.margins),
      paperPreset: identifyPaperPreset(layout.paperSize),
      paperWidth: twipsToMm(layout.paperSize.width),
      paperHeight: twipsToMm(layout.paperSize.height),
      orientation: layout.orientation,
    };
  }, [getCurrentLayout]);

  const [form, setForm] = useState(initLayout);

  // 对话框打开时重新读取当前布局
  useEffect(() => {
    if (open) {
      setForm(initLayout());
    }
  }, [open, initLayout]);

  /** 页边距预设变更 */
  const handleMarginPresetChange = useCallback((value: string) => {
    const preset = MARGIN_PRESETS[value as keyof typeof MARGIN_PRESETS];
    if (!preset) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      marginTop: twipsToMm(preset.top),
      marginBottom: twipsToMm(preset.bottom),
      marginLeft: twipsToMm(preset.left),
      marginRight: twipsToMm(preset.right),
      marginPreset: value,
    }));
  }, []);

  /** 纸张预设变更 */
  const handlePaperPresetChange = useCallback(
    (value: string) => {
      const preset = PAPER_PRESETS[value as keyof typeof PAPER_PRESETS];
      if (!preset) {
        return;
      }
      const orientation = form.orientation;
      let w = twipsToMm(preset.width);
      let h = twipsToMm(preset.height);
      if (orientation === "landscape" && w < h) {
        [w, h] = [h, w];
      }
      setForm((prev) => ({
        ...prev,
        paperPreset: value as typeof prev.paperPreset,
        paperWidth: w,
        paperHeight: h,
      }));
    },
    [form.orientation]
  );

  /** 方向变更 */
  const handleOrientationChange = useCallback((value: string) => {
    const orientation = value as Orientation;
    setForm((prev) => {
      // 交换宽高
      const w = prev.paperHeight;
      const h = prev.paperWidth;
      return { ...prev, orientation, paperWidth: w, paperHeight: h };
    });
  }, []);

  /** 自定义边距输入 */
  const handleMarginChange = useCallback(
    (field: keyof Margins, value: string) => {
      const num = Number.parseFloat(value);
      if (Number.isNaN(num)) {
        return;
      }
      setForm((prev) => ({
        ...prev,
        [`margin${field.charAt(0).toUpperCase() + field.slice(1)}`]: num,
        marginPreset: "custom",
      }));
    },
    []
  );

  /** 应用设置 */
  const handleApply = useCallback(() => {
    const layout = getCurrentLayout();

    // 应用边距
    const marginsChanged =
      twipsToMm(layout.margins.top) !== form.marginTop ||
      twipsToMm(layout.margins.bottom) !== form.marginBottom ||
      twipsToMm(layout.margins.left) !== form.marginLeft ||
      twipsToMm(layout.margins.right) !== form.marginRight;

    if (marginsChanged) {
      // 尝试预设优先
      if (form.marginPreset !== "custom") {
        applyMarginPreset(form.marginPreset);
      } else {
        setMargins({
          top: mmToTwips(form.marginTop),
          right: mmToTwips(form.marginRight),
          bottom: mmToTwips(form.marginBottom),
          left: mmToTwips(form.marginLeft),
        });
      }
    }

    // 应用纸张大小
    const paperSize: PaperSize = {
      width: mmToTwips(form.paperWidth),
      height: mmToTwips(form.paperHeight),
    };
    const currentWidth = twipsToMm(layout.paperSize.width);
    const currentHeight = twipsToMm(layout.paperSize.height);
    if (
      currentWidth !== form.paperWidth ||
      currentHeight !== form.paperHeight
    ) {
      if (form.paperPreset !== "custom") {
        applyPaperPreset(form.paperPreset);
      } else {
        setPageSize(paperSize);
      }
    }

    // 应用方向
    if (layout.orientation !== form.orientation) {
      setOrientation(form.orientation);
    }

    onClose();
  }, [
    form,
    getCurrentLayout,
    setMargins,
    setPageSize,
    setOrientation,
    applyMarginPreset,
    applyPaperPreset,
    onClose,
  ]);

  const unitLabel = t("pageSetup.unit.mm");

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pageSetup.title")}</DialogTitle>
          <DialogDescription>
            {t("pageSetup.margins")} &amp; {t("pageSetup.paperSize")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 页边距 */}
          <fieldset className="space-y-3">
            <legend className="font-medium text-sm">
              {t("pageSetup.margins")}
            </legend>

            {/* 预设选择 */}
            <div className="flex items-center gap-2">
              <label
                className="w-16 text-muted-foreground text-xs"
                htmlFor="margin-preset"
              >
                {t("pageSetup.margins.preset")}
              </label>
              <Select
                onValueChange={handleMarginPresetChange}
                value={form.marginPreset}
              >
                <SelectTrigger
                  className="h-8 flex-1 text-xs"
                  id="margin-preset"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARGIN_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {t(`pageSetup.margins.${opt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 四边距输入 */}
            <div className="grid grid-cols-2 gap-2">
              {(
                ["top", "bottom", "left", "right"] as Array<
                  keyof typeof MARGIN_PRESETS.normal
                >
              ).map((side) => (
                <div className="flex items-center gap-2" key={side}>
                  <label
                    className="w-8 text-muted-foreground text-xs"
                    htmlFor={`margin-${side}`}
                  >
                    {t(`pageSetup.margins.${side}`)}
                  </label>
                  <Input
                    className="h-8 flex-1 text-xs"
                    id={`margin-${side}`}
                    max={200}
                    min={0}
                    onChange={(e) => handleMarginChange(side, e.target.value)}
                    step={0.1}
                    type="number"
                    value={
                      form[
                        `margin${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof typeof form
                      ]
                    }
                  />
                  <span className="w-6 text-muted-foreground text-xs">
                    {unitLabel}
                  </span>
                </div>
              ))}
            </div>
          </fieldset>

          {/* 分隔 */}
          <hr className="border-border" />

          {/* 纸张大小 */}
          <fieldset className="space-y-3">
            <legend className="font-medium text-sm">
              {t("pageSetup.paperSize")}
            </legend>

            {/* 纸张预设 */}
            <div className="flex items-center gap-2">
              <label
                className="w-16 text-muted-foreground text-xs"
                htmlFor="paper-preset"
              >
                {t("pageSetup.paperSize.preset")}
              </label>
              <Select
                onValueChange={handlePaperPresetChange}
                value={form.paperPreset}
              >
                <SelectTrigger className="h-8 flex-1 text-xs" id="paper-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {t(`pageSetup.paperSize.${opt}`)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    {t("pageSetup.paperSize.custom")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 自定义宽高 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <label
                  className="w-8 text-muted-foreground text-xs"
                  htmlFor="paper-width"
                >
                  {t("pageSetup.paperSize.width")}
                </label>
                <Input
                  className="h-8 flex-1 text-xs"
                  id="paper-width"
                  max={600}
                  min={50}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    if (!Number.isNaN(v)) {
                      setForm((prev) => ({
                        ...prev,
                        paperWidth: v,
                        paperPreset: "custom",
                      }));
                    }
                  }}
                  step={0.1}
                  type="number"
                  value={form.paperWidth}
                />
                <span className="w-6 text-muted-foreground text-xs">
                  {unitLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="w-8 text-muted-foreground text-xs"
                  htmlFor="paper-height"
                >
                  {t("pageSetup.paperSize.height")}
                </label>
                <Input
                  className="h-8 flex-1 text-xs"
                  id="paper-height"
                  max={600}
                  min={50}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    if (!Number.isNaN(v)) {
                      setForm((prev) => ({
                        ...prev,
                        paperHeight: v,
                        paperPreset: "custom",
                      }));
                    }
                  }}
                  step={0.1}
                  type="number"
                  value={form.paperHeight}
                />
                <span className="w-6 text-muted-foreground text-xs">
                  {unitLabel}
                </span>
              </div>
            </div>
          </fieldset>

          {/* 分隔 */}
          <hr className="border-border" />

          {/* 纸张方向 */}
          <fieldset className="space-y-3">
            <legend className="font-medium text-sm">
              {t("pageSetup.orientation")}
            </legend>

            <div className="flex gap-2">
              {ORIENTATION_OPTIONS.map((opt) => (
                <Button
                  className="flex-1"
                  key={opt}
                  onClick={() => handleOrientationChange(opt)}
                  size="sm"
                  type="button"
                  variant={form.orientation === opt ? "default" : "outline"}
                >
                  {t(`pageSetup.orientation.${opt}`)}
                </Button>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            {t("dialog.cancel")}
          </Button>
          <Button onClick={handleApply} size="sm" type="button">
            {t("dialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
