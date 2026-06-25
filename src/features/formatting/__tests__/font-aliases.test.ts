const SIMHEI_BLOCK_RE = /font-family: 'SimHei'[^}]+}/;

// font-aliases.test.ts — 字体别名映射测试 / Font alias mapping tests
// TDD: 先写测试（红），再写实现（绿）

import { describe, expect, it } from "vitest";
import {
  CJK_FONT_ALIASES,
  FONT_ALIAS_STYLE_ID,
  generateFontFaceCSS,
  injectFontAliases,
} from "../font-aliases";

describe("CJK_FONT_ALIASES", () => {
  it("包含所有 CJK OOXML 字体名", () => {
    const expectedKeys = [
      "SimSun",
      "SimHei",
      "Microsoft YaHei",
      "KaiTi",
      "FangSong",
      "DengXian",
      "PingFang SC",
      "STSong",
      "STKaiti",
      "STHeiti",
      "Noto Serif SC",
      "Noto Sans SC",
    ];
    for (const key of expectedKeys) {
      expect(CJK_FONT_ALIASES[key]).toBeDefined();
    }
  });

  it("每个字体名至少有一个 local() 候选", () => {
    for (const [font, locals] of Object.entries(CJK_FONT_ALIASES)) {
      expect(locals.length).toBeGreaterThan(0);
      // 第一个候选应为字体本身（同名系统字体优先）
      expect(locals[0]).toBe(font);
    }
  });

  it("SimHei 别名包含 macOS 系统黑体", () => {
    const locals = CJK_FONT_ALIASES.SimHei;
    expect(locals).toContain("Heiti SC");
    expect(locals).toContain("PingFang SC");
  });

  it("SimSun 别名包含 macOS 系统宋体", () => {
    const locals = CJK_FONT_ALIASES.SimSun;
    expect(locals).toContain("Songti SC");
  });

  it("PingFang SC 别名包含 Windows 系统雅黑", () => {
    const locals = CJK_FONT_ALIASES["PingFang SC"];
    expect(locals).toContain("Microsoft YaHei");
  });
});

describe("generateFontFaceCSS", () => {
  it("为每个 CJK 字体生成 @font-face 规则", () => {
    const css = generateFontFaceCSS();
    for (const font of Object.keys(CJK_FONT_ALIASES)) {
      expect(css).toContain(`font-family: '${font}'`);
    }
  });

  it("SimHei 规则包含 local() 候选", () => {
    const css = generateFontFaceCSS();
    // 应包含 local('SimHei'), local('Heiti SC'), local('PingFang SC')
    expect(css).toContain("local('SimHei')");
    expect(css).toContain("local('Heiti SC')");
    expect(css).toContain("local('PingFang SC')");
  });

  it("多个 local() 用逗号连接", () => {
    const css = generateFontFaceCSS();
    // SimHei 行应包含连续的 local() 调用
    const simheiBlock = css.match(SIMHEI_BLOCK_RE);
    expect(simheiBlock).not.toBeNull();
    expect(simheiBlock?.[0]).toContain("local('SimHei')");
    expect(simheiBlock?.[0]).toContain(",");
  });
});

describe("injectFontAliases", () => {
  it("注入 <style> 元素到 document.head", () => {
    // 清理可能存在的旧元素
    document.getElementById(FONT_ALIAS_STYLE_ID)?.remove();

    injectFontAliases();
    const el = document.getElementById(FONT_ALIAS_STYLE_ID);
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe("STYLE");
    expect(el?.textContent).toContain("@font-face");
  });

  it("幂等：多次调用不创建重复元素", () => {
    document.getElementById(FONT_ALIAS_STYLE_ID)?.remove();

    injectFontAliases();
    injectFontAliases();
    injectFontAliases();

    const els = document.querySelectorAll(`#${FONT_ALIAS_STYLE_ID}`);
    expect(els.length).toBe(1);
  });
});
