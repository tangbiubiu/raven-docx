// src/features/ribbon/components/FontCombobox.tsx — 字体选择 Combobox / Font selection Combobox
// §3.2: 用 Combobox 替换 Select,支持显示文档中实际字体名(即使不在清单中)。
// Combobox = Popover + Command(cmdk) + Button。

import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { type ElementRef, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FONT_FAMILIES } from "@/features/formatting/constants";
import { applyFont } from "@/features/formatting/format-apply";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useFontFamilyValue } from "./RibbonFormatButtons";

/**
 * 字体选择 Combobox。
 *
 * - 输入框显示当前选区字体名(来自 useFontFamilyValue)
 * - 混合选区或无 mark → 显示空
 * - 文档字体不在清单中 → 显示实际字体名(只读)
 * - 可输入搜索过滤字体清单
 * - 选中清单项 → applyFont(value)
 */
export function FontCombobox() {
  const { t } = useT();
  const currentValue = useFontFamilyValue();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<ElementRef<typeof PopoverTrigger>>(null);

  // 过滤字体清单:按搜索词匹配 label 或 font 名
  const filtered = FONT_FAMILIES.filter((f) => {
    if (!search) {
      return true;
    }
    const q = search.toLowerCase();
    return (
      f.label.toLowerCase().includes(q) || f.font.toLowerCase().includes(q)
    );
  });

  const handleSelect = (value: string) => {
    applyFont(value);
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          className={cn(
            "flex h-7 w-[110px] items-center justify-between rounded border bg-background px-2 text-xs",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring"
          )}
          data-testid="ribbon-fontFamily"
          ref={triggerRef}
          role="combobox"
          type="button"
        >
          {/* 显示当前字体名;混合/无 mark 为空时显示 placeholder */}
          <span className="truncate">{currentValue || t("format.font")}</span>
          <ChevronDown className="ml-1 size-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-0">
        <CommandPrimitive
          className="overflow-hidden rounded-md bg-popover"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <CommandPrimitive.Input
            className="flex h-7 w-full border-b bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            onValueChange={setSearch}
            placeholder={t("format.font")}
            value={search}
          />
          <CommandPrimitive.List className="max-h-[240px] overflow-y-auto overflow-x-hidden">
            <CommandPrimitive.Empty className="py-2 text-center text-muted-foreground text-xs">
              {t("format.font")}
            </CommandPrimitive.Empty>
            <CommandPrimitive.Group>
              {filtered.map((f) => (
                <CommandPrimitive.Item
                  className={cn(
                    "flex cursor-default items-center gap-1 rounded-sm px-2 py-1 text-xs",
                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                  )}
                  key={f.value}
                  onSelect={() => handleSelect(f.value)}
                  value={f.value}
                >
                  <Check
                    className={cn(
                      "size-3 shrink-0",
                      currentValue === f.label ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {f.label}
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
