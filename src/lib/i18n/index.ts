// i18n/index.ts — i18n 初始化与 React Hook (i18n Initialization & React Hook)
// 简单的 key-value 翻译系统，fallback 链：当前语言 → zh-CN → key 原文
// Reference: .dev/docs/i18n-standards.md §5

import { useCallback } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { en } from "./en";
import type { Translations } from "./types";
import { zhCN } from "./zh-CN";

/**
 * 所有语言翻译字典
 */
const translations: Record<string, Translations> = {
  "zh-CN": zhCN,
  en,
};

/**
 * 同步获取翻译文本。
 * 不依赖 React，可在 store action 等非组件上下文中使用。
 *
 * @param key - 翻译 key
 * @param lang - 语言代码（默认 "zh-CN"）
 * @param params - 模板参数
 * @returns 翻译后的文本
 */
export function t(
  key: string,
  lang?: string,
  params?: Record<string, string | number>
): string {
  const locale = lang ?? "zh-CN";
  let text = translations[locale]?.[key] ?? translations["zh-CN"]?.[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }

  return text;
}

/**
 * React Hook：获取翻译函数。
 * 自动从 useSettingsStore 读取当前语言设置。
 *
 * @returns 翻译函数 `(key, params?) => string`
 *
 * @example
 * ```tsx
 * function StatusBar() {
 *   const { t } = useT();
 *   return (
 *     <span>{t("editor.statusBar.page", { current: 1, total: 5 })}</span>
 *   );
 * }
 * ```
 */
export function useT(): {
  t: (key: string, params?: Record<string, string | number>) => string;
} {
  const locale = useSettingsStore((s) => s.editorConfig.locale);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      t(key, locale, params),
    [locale]
  );

  return { t: translate };
}
