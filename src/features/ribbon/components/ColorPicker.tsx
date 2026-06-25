// src/features/ribbon/components/ColorPicker.tsx — 颜色色板选择器 / Color swatch picker
// Phase 2.4: Popover 展开预设色板 + 原生 color input 「更多颜色」
// Reference: .dev/plan/2026-06-23-ribbon-enhancement.md §Phase 2

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** 预设 10 色色板 / Preset 10-color swatch */
const SWATCHES: { hex: string; nameKey: string }[] = [
  { hex: "#000000", nameKey: "color.black" },
  { hex: "#FFFFFF", nameKey: "color.white" },
  { hex: "#FF0000", nameKey: "color.red" },
  { hex: "#FFA500", nameKey: "color.orange" },
  { hex: "#FFFF00", nameKey: "color.yellow" },
  { hex: "#00FF00", nameKey: "color.green" },
  { hex: "#0000FF", nameKey: "color.blue" },
  { hex: "#800080", nameKey: "color.purple" },
  { hex: "#FFC0CB", nameKey: "color.pink" },
  { hex: "#808080", nameKey: "color.gray" },
];

type ColorPickerProps = {
  /** 当前颜色(hex)/ Current color */
  value?: string;
  /** 颜色变更回调 / Color change handler */
  onChange: (color: string) => void;
  /** 触发按钮的 aria-label / Trigger button aria-label */
  label: string;
  /** 测试 ID / Test id */
  testId?: string;
};

/**
 * 颜色色板选择器:Popover 展开预设色板,
 * 下方「更多颜色」展开原生 `<input type="color">`。
 */
export function ColorPicker({
  value,
  onChange,
  label,
  testId,
}: ColorPickerProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [showNative, setShowNative] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild={true}>
        <button
          aria-label={label}
          className="relative inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-accent"
          data-testid={testId}
          title={label}
          type="button"
        >
          {/* 色块指示器:显示当前颜色 / Color indicator showing current value */}
          <span
            className="block size-3.5 rounded-sm border border-border"
            style={{ backgroundColor: value ?? "transparent" }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        {/* 色板 grid / Swatch grid */}
        <div className="grid grid-cols-5 gap-1">
          {SWATCHES.map((sw) => {
            const selected = value?.toUpperCase() === sw.hex.toUpperCase();
            return (
              <button
                aria-label={t(sw.nameKey)}
                aria-pressed={selected}
                className={cn(
                  "size-5 rounded-sm border border-border transition hover:scale-110",
                  selected ? "ring-2 ring-ring ring-offset-1" : ""
                )}
                data-testid="color-swatch"
                key={sw.hex}
                onClick={() => {
                  onChange(sw.hex);
                  setOpen(false);
                }}
                style={{ backgroundColor: sw.hex }}
                title={t(sw.nameKey)}
                type="button"
              />
            );
          })}
        </div>

        {/* 更多颜色:原生 color input / More colors: native color input */}
        <button
          className="mt-2 w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
          onClick={() => setShowNative((s) => !s)}
          type="button"
        >
          {t("format.moreColors")}
        </button>
        {showNative ? (
          <input
            aria-label={t("format.moreColors")}
            className="mt-1 w-full cursor-pointer"
            data-testid="color-native-input"
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(false);
            }}
            type="color"
            value={value ?? "#000000"}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
