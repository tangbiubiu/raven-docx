// font-aliases.ts — CJK 字体跨平台别名映射 / CJK font cross-platform alias mapping
// 通过 CSS @font-face local() 将 OOXML 字体名映射到各平台系统字体。
// 原理等同 Word 的字体替换表：零下载、零用户操作。
// Reference: .dev/plan/2026-06-25-font-system-redesign.md §2.1

/**
 * CJK 字体别名映射表。
 * key = OOXML 字体名（文档中存储的名称）
 * value = local() 候选列表（按优先级排列，第一个为字体本身）
 *
 * 浏览器按顺序尝试 local()，命中第一个可用系统字体即停止。
 * 全部未命中时，靠字体表 fallback stack 的通用族（serif/sans-serif）兜底。
 */
export const CJK_FONT_ALIASES: Record<string, string[]> = {
  // 宋族 / Serif family
  SimSun: ["SimSun", "Songti SC", "STSong"],
  STSong: ["STSong", "Songti SC", "SimSun"],
  "Noto Serif SC": ["Noto Serif SC"],

  // 黑族 / Sans-serif family
  SimHei: ["SimHei", "Heiti SC", "PingFang SC"],
  "Microsoft YaHei": ["Microsoft YaHei", "PingFang SC", "Heiti SC"],
  DengXian: ["DengXian", "PingFang SC", "Heiti SC"],
  "PingFang SC": ["PingFang SC", "Microsoft YaHei", "Heiti SC"],
  STHeiti: ["STHeiti", "Heiti SC", "PingFang SC"],
  "Noto Sans SC": ["Noto Sans SC"],

  // 楷族 / Kai (script) family
  KaiTi: ["KaiTi", "Kaiti SC", "STKaiti"],
  STKaiti: ["STKaiti", "Kaiti SC", "KaiTi"],

  // 仿宋 / FangSong family
  FangSong: ["FangSong", "STFangsong"],
};

/** <style> 元素的 DOM id */
export const FONT_ALIAS_STYLE_ID = "font-aliases";

/**
 * 根据 CJK_FONT_ALIASES 生成 @font-face CSS 字符串。
 * 每个字体名生成一条规则，src 为 local() 候选链。
 */
export function generateFontFaceCSS(): string {
  const rules = Object.entries(CJK_FONT_ALIASES).map(([font, locals]) => {
    const srcList = locals.map((l) => `local('${l}')`).join(", ");
    return `@font-face {\n  font-family: '${font}';\n  src: ${srcList};\n}`;
  });
  return rules.join("\n");
}

/**
 * 将字体别名 CSS 注入 document.head 的 <style> 元素。
 * 幂等：多次调用只更新同一个 <style>，不创建重复元素。
 */
export function injectFontAliases(): void {
  const css = generateFontFaceCSS();
  let el = document.getElementById(FONT_ALIAS_STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = FONT_ALIAS_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
