// i18n/types.ts — i18n 类型定义 (i18n Type Definitions)
// 确保 zh-CN 和 en 的 key 完全一致

/**
 * 所有翻译 key 的类型。
 * 使用 Record<string, string> 以保持灵活性，
 * 同时通过 zh-CN 作为权威 key 来源。
 */
export type TranslationKey = string;

/**
 * 翻译字典类型
 */
export type Translations = Record<TranslationKey, string>;
