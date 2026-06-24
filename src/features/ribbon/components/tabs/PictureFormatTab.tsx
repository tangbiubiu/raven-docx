// src/features/ribbon/components/tabs/PictureFormatTab.tsx — 图片格式上下文标签页 / Picture Format contextual tab
// Phase 4: 选中图片时出现的专属标签页
import { Crop, Frame } from "lucide-react";
import { useState } from "react";
import {
  execSetImageWrapType,
  type ImageWrapTarget,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

/** 环绕类型选项 / Wrap type options */
const WRAP_OPTIONS: { value: ImageWrapTarget; labelKey: string }[] = [
  { value: "inline", labelKey: "ribbon.image.wrap.inline" },
  { value: "square", labelKey: "ribbon.image.wrap.square" },
  { value: "tight", labelKey: "ribbon.image.wrap.tight" },
  { value: "topAndBottom", labelKey: "ribbon.image.wrap.topAndBottom" },
  { value: "behind", labelKey: "ribbon.image.wrap.behind" },
  { value: "inFront", labelKey: "ribbon.image.wrap.inFront" },
];

export function PictureFormatTab(_props: RibbonCallbacks) {
  const { t } = useT();
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [borderColor, setBorderColor] = useState("#000000");

  const handleWrap = (value: string) => {
    execSetImageWrapType(value as ImageWrapTarget);
  };

  const handleBorderColor = (value: string) => {
    setBorderColor(value);
    // 图片边框颜色:暂无独立图片边框命令,此处仅记录选择值
  };

  return (
    <>
      {/* 环绕类型 / Wrap type */}
      <RibbonGroup labelKey="ribbon.group.wrap">
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <span className="text-[10px] text-muted-foreground">
            {t("ribbon.image.wrap")}
          </span>
          <select
            className="h-7 rounded border border-border px-1 text-xs"
            data-testid="ribbon-imageWrap"
            defaultValue=""
            onChange={(e) => handleWrap(e.target.value)}
          >
            <option disabled value="">
              {t("ribbon.image.wrap.select")}
            </option>
            {WRAP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 大小 / Size */}
      <RibbonGroup labelKey="ribbon.group.size">
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <span className="text-[10px] text-muted-foreground">
            {t("ribbon.image.width")}
          </span>
          <input
            className="h-7 w-14 rounded border border-border px-1 text-xs"
            data-testid="ribbon-imageWidth"
            inputMode="numeric"
            onChange={(e) => setWidth(e.target.value)}
            placeholder="0"
            type="number"
            value={width}
          />
        </label>
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <span className="text-[10px] text-muted-foreground">
            {t("ribbon.image.height")}
          </span>
          <input
            className="h-7 w-14 rounded border border-border px-1 text-xs"
            data-testid="ribbon-imageHeight"
            inputMode="numeric"
            onChange={(e) => setHeight(e.target.value)}
            placeholder="0"
            type="number"
            value={height}
          />
        </label>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 裁剪 / Crop */}
      <RibbonGroup labelKey="ribbon.group.crop">
        <RibbonButton label={t("ribbon.image.crop")} testId="ribbon-cropImage">
          <Crop className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 边框 / Border */}
      <RibbonGroup labelKey="ribbon.group.border">
        <label className="flex h-12 flex-col items-center justify-center gap-0.5 text-xs">
          <Frame className="size-4" />
          <input
            className="h-5 w-10 rounded border border-border px-0.5 text-[10px]"
            data-testid="ribbon-imageBorderColor"
            onChange={(e) => handleBorderColor(e.target.value)}
            type="color"
            value={borderColor}
          />
        </label>
      </RibbonGroup>
    </>
  );
}
