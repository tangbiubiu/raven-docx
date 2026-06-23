// src/features/ribbon/ribbon-config.ts — Ribbon 标签页配置 / Ribbon tab config
import type { RibbonTab } from "@/stores/useAppStore";

/** 标签页配置 / Tab config */
export const RIBBON_TABS: { id: RibbonTab; labelKey: string }[] = [
  { id: "home", labelKey: "ribbon.tab.home" },
  { id: "insert", labelKey: "ribbon.tab.insert" },
  { id: "layout", labelKey: "ribbon.tab.layout" },
  { id: "references", labelKey: "ribbon.tab.references" },
  { id: "review", labelKey: "ribbon.tab.review" },
  { id: "view", labelKey: "ribbon.tab.view" },
];
