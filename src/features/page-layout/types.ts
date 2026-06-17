// features/page-layout/types.ts — 页面布局类型定义 (Page Layout Type Definitions)
// 页边距、纸张大小、纸张方向、页眉页脚等类型
// Reference: .dev/docs/module-split.md §3.5 · FRS F-100~104

/** 页边距 (twips: 1/20 pt) */
export type Margins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** 纸张预设 */
export type PaperPreset = "A4" | "Letter" | "Legal" | "B5" | "custom";

/** 纸张方向 */
export type Orientation = "portrait" | "landscape";

/** 纸张尺寸 (twips) */
export type PaperSize = {
  width: number;
  height: number;
};

/** 页边距预设 */
export type MarginPreset = "normal" | "narrow" | "moderate" | "wide" | "custom";

/**
 * mm → twips 转换 (1 mm ≈ 56.69 twips)
 * OOXML 使用 twips 作为度量单位
 */
export const MM_TO_TWIPS = 56.69;
/** pt → twips 转换 (1 pt = 20 twips) */
export const PT_TO_TWIPS = 20;

/** 预设纸张尺寸 (mm → twips) */
export const PAPER_PRESETS: Record<PaperPreset, PaperSize> = {
  A4: {
    width: Math.round(210 * MM_TO_TWIPS),
    height: Math.round(297 * MM_TO_TWIPS),
  },
  Letter: {
    width: Math.round(215.9 * MM_TO_TWIPS),
    height: Math.round(279.4 * MM_TO_TWIPS),
  },
  Legal: {
    width: Math.round(215.9 * MM_TO_TWIPS),
    height: Math.round(355.6 * MM_TO_TWIPS),
  },
  B5: {
    width: Math.round(176 * MM_TO_TWIPS),
    height: Math.round(250 * MM_TO_TWIPS),
  },
  custom: { width: 0, height: 0 },
};

/** 预设页边距 (mm → twips)，Word 标准预设 */
export const MARGIN_PRESETS: Record<MarginPreset, Margins> = {
  normal: {
    top: Math.round(25.4 * MM_TO_TWIPS),
    right: Math.round(25.4 * MM_TO_TWIPS),
    bottom: Math.round(25.4 * MM_TO_TWIPS),
    left: Math.round(25.4 * MM_TO_TWIPS),
  },
  narrow: {
    top: Math.round(12.7 * MM_TO_TWIPS),
    right: Math.round(12.7 * MM_TO_TWIPS),
    bottom: Math.round(12.7 * MM_TO_TWIPS),
    left: Math.round(12.7 * MM_TO_TWIPS),
  },
  moderate: {
    top: Math.round(25.4 * MM_TO_TWIPS),
    right: Math.round(19.05 * MM_TO_TWIPS),
    bottom: Math.round(25.4 * MM_TO_TWIPS),
    left: Math.round(19.05 * MM_TO_TWIPS),
  },
  wide: {
    top: Math.round(25.4 * MM_TO_TWIPS),
    right: Math.round(50.8 * MM_TO_TWIPS),
    bottom: Math.round(25.4 * MM_TO_TWIPS),
    left: Math.round(50.8 * MM_TO_TWIPS),
  },
  custom: { top: 0, right: 0, bottom: 0, left: 0 },
};

/**
 * 从给定尺寸识别最接近的纸张预设
 */
export function identifyPaperPreset(size: PaperSize): PaperPreset {
  const threshold = 100; // twips tolerance (~1.76mm)
  for (const [key, preset] of Object.entries(PAPER_PRESETS)) {
    if (key === "custom") {
      continue;
    }
    if (
      Math.abs(preset.width - size.width) < threshold &&
      Math.abs(preset.height - size.height) < threshold
    ) {
      return key as PaperPreset;
    }
  }
  return "custom";
}

/**
 * 从给定边距识别最接近的页边距预设
 */
export function identifyMarginPreset(margins: Margins): MarginPreset {
  const threshold = 100;
  for (const [key, preset] of Object.entries(MARGIN_PRESETS)) {
    if (key === "custom") {
      continue;
    }
    const m = preset as Margins;
    if (
      Math.abs(m.top - margins.top) < threshold &&
      Math.abs(m.right - margins.right) < threshold &&
      Math.abs(m.bottom - margins.bottom) < threshold &&
      Math.abs(m.left - margins.left) < threshold
    ) {
      return key as MarginPreset;
    }
  }
  return "custom";
}

/** 页眉页脚内容 */
export type HeaderFooterContent = {
  /** 左侧区域内容 */
  left?: string;
  /** 中间区域内容 */
  center?: string;
  /** 右侧区域内容 */
  right?: string;
};

/** 页眉页脚配置 */
export type HeaderFooterConfig = {
  header: HeaderFooterContent;
  footer: HeaderFooterContent;
  /** 首页不同 */
  differentFirstPage: boolean;
  /** 奇偶页不同 */
  differentOddEven: boolean;
};

/** 页面布局完整状态 */
export type PageLayoutState = {
  margins: Margins;
  paperSize: PaperSize;
  orientation: Orientation;
  headerFooter: HeaderFooterConfig;
};
