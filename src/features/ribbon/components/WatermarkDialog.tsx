// src/features/ribbon/components/WatermarkDialog.tsx — 水印对话框 / Watermark dialog
// 文本水印设置:文字/字体/颜色/版式(斜向/水平)/半透明/字号。
// 打开时从当前编辑器状态预填;确定 → execSetWatermark,清除 → execSetWatermark(null)。

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { execGetWatermark, execSetWatermark } from "@/features/editor/commands";
import { useT } from "@/lib/i18n";

/** 预设字号(pt);"自动"表示省略 fontSize(Word Auto 缩放)/ Preset sizes (pt); "auto" omits fontSize */
const WATERMARK_SIZES = [24, 36, 48, 72] as const;

/** 默认文本水印(Word DRAFT 水印的常见取值)/ Sensible defaults */
const DEFAULT_WATERMARK = {
  font: "Calibri",
  color: "#C0C0C0",
  layout: "diagonal" as const,
  semitransparent: true,
};

type WatermarkDialogProps = {
  onClose: () => void;
};

export function WatermarkDialog({ onClose }: WatermarkDialogProps) {
  const { t } = useT();
  // 打开时一次性读取当前水印预填(纯 store 读,无副作用)
  const existing = execGetWatermark();

  const [text, setText] = useState(existing?.text ?? "");
  const [font, setFont] = useState(existing?.font ?? DEFAULT_WATERMARK.font);
  const [color, setColor] = useState(
    existing?.color ?? DEFAULT_WATERMARK.color
  );
  const [layout, setLayout] = useState<"diagonal" | "horizontal">(
    existing?.layout ?? DEFAULT_WATERMARK.layout
  );
  const [semitransparent, setSemitransparent] = useState(
    existing?.semitransparent ?? DEFAULT_WATERMARK.semitransparent
  );
  const [size, setSize] = useState(
    existing?.fontSize ? String(existing.fontSize) : "auto"
  );

  /** 应用水印 / Apply watermark */
  const handleApply = () => {
    execSetWatermark({
      kind: "text",
      text,
      font,
      color,
      semitransparent,
      layout,
      ...(size !== "auto" ? { fontSize: Number(size) } : {}),
    });
    onClose();
  };

  /** 清除水印 / Clear watermark */
  const handleClear = () => {
    execSetWatermark(null);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="watermark-dialog">
      <h3 className="font-semibold">{t("watermark.title")}</h3>

      <div className="flex flex-col gap-1">
        <label
          className="text-muted-foreground text-xs"
          htmlFor="watermark-text"
        >
          {t("watermark.text")}
        </label>
        <Input
          data-testid="watermark-text-input"
          id="watermark-text"
          onChange={(e) => setText(e.target.value)}
          placeholder={t("watermark.text")}
          value={text}
        />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor="watermark-font"
          >
            {t("watermark.font")}
          </label>
          <Input
            className="h-7 text-xs"
            data-testid="watermark-font-input"
            id="watermark-font"
            onChange={(e) => setFont(e.target.value)}
            value={font}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("watermark.color")}
          </span>
          <input
            aria-label={t("watermark.color")}
            className="h-7 w-10 cursor-pointer rounded border border-input bg-transparent"
            data-testid="watermark-color-input"
            onChange={(e) => setColor(e.target.value)}
            type="color"
            value={color}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("watermark.layout")}
          </span>
          <Select
            onValueChange={(v) => setLayout(v as "diagonal" | "horizontal")}
            value={layout}
          >
            <SelectTrigger className="h-7 text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diagonal">
                {t("watermark.diagonal")}
              </SelectItem>
              <SelectItem value="horizontal">
                {t("watermark.horizontal")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("watermark.size")}
          </span>
          <Select onValueChange={setSize} value={size}>
            <SelectTrigger className="h-7 text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("watermark.size.auto")}</SelectItem>
              {WATERMARK_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} pt
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          checked={semitransparent}
          className="size-3.5"
          data-testid="watermark-semitransparent-input"
          onChange={(e) => setSemitransparent(e.target.checked)}
          type="checkbox"
        />
        {t("watermark.semitransparent")}
      </label>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Button onClick={handleClear} size="sm" type="button" variant="ghost">
          {t("watermark.clear")}
        </Button>
        <div className="flex gap-2">
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            {t("watermark.cancel")}
          </Button>
          <Button
            data-testid="watermark-apply"
            onClick={handleApply}
            size="sm"
            type="button"
          >
            {t("watermark.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
