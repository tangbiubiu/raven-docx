// features/page-layout/__tests__/types.test.ts — 页面布局类型测试
// 测试单位转换和预设识别函数

import { describe, expect, it } from "vitest";
import {
  identifyMarginPreset,
  identifyPaperPreset,
  MARGIN_PRESETS,
  MM_TO_TWIPS,
  PAPER_PRESETS,
  PT_TO_TWIPS,
} from "../types";

describe("PAPER_PRESETS", () => {
  it("A4 尺寸正确", () => {
    expect(PAPER_PRESETS.A4.width).toBeGreaterThan(11_000);
    expect(PAPER_PRESETS.A4.width).toBeLessThan(13_000);
    expect(PAPER_PRESETS.A4.height).toBeGreaterThan(16_000);
    expect(PAPER_PRESETS.A4.height).toBeLessThan(18_000);
  });

  it("Letter 尺寸正确", () => {
    expect(PAPER_PRESETS.Letter.width).toBeGreaterThan(12_000);
    expect(PAPER_PRESETS.Letter.height).toBeGreaterThan(15_000);
  });
});

describe("MARGIN_PRESETS", () => {
  it("普通边距（normal）约为 25.4mm", () => {
    const normal = MARGIN_PRESETS.normal;
    const mm = Math.round(normal.top / MM_TO_TWIPS);
    expect(mm).toBe(25);
  });

  it("窄边距（narrow）约为 12.7mm", () => {
    const narrow = MARGIN_PRESETS.narrow;
    const mm = Math.round(narrow.top / MM_TO_TWIPS);
    expect(mm).toBe(13);
  });

  it("宽边距（wide）约为 50.8mm", () => {
    const wide = MARGIN_PRESETS.wide;
    const mm = Math.round(wide.left / MM_TO_TWIPS);
    expect(mm).toBe(51);
  });
});

describe("identifyPaperPreset", () => {
  it("精确匹配 A4", () => {
    expect(identifyPaperPreset(PAPER_PRESETS.A4)).toBe("A4");
  });

  it("精确匹配 Letter", () => {
    expect(identifyPaperPreset(PAPER_PRESETS.Letter)).toBe("Letter");
  });

  it("近似匹配 A4（微小偏移）", () => {
    const nearA4 = {
      width: PAPER_PRESETS.A4.width + 50,
      height: PAPER_PRESETS.A4.height - 50,
    };
    expect(identifyPaperPreset(nearA4)).toBe("A4");
  });

  it("未知尺寸返回 custom", () => {
    expect(identifyPaperPreset({ width: 1, height: 1 })).toBe("custom");
  });
});

describe("identifyMarginPreset", () => {
  it("精确匹配 normal", () => {
    expect(identifyMarginPreset(MARGIN_PRESETS.normal)).toBe("normal");
  });

  it("精确匹配 narrow", () => {
    expect(identifyMarginPreset(MARGIN_PRESETS.narrow)).toBe("narrow");
  });

  it("精确匹配 moderate", () => {
    expect(identifyMarginPreset(MARGIN_PRESETS.moderate)).toBe("moderate");
  });

  it("精确匹配 wide", () => {
    expect(identifyMarginPreset(MARGIN_PRESETS.wide)).toBe("wide");
  });

  it("未知边距返回 custom", () => {
    expect(identifyMarginPreset({ top: 1, right: 2, bottom: 3, left: 4 })).toBe(
      "custom"
    );
  });
});

describe("单位转换常量", () => {
  it("MM_TO_TWIPS 为正数", () => {
    expect(MM_TO_TWIPS).toBeGreaterThan(0);
  });

  it("PT_TO_TWIPS 为 20", () => {
    expect(PT_TO_TWIPS).toBe(20);
  });
});
