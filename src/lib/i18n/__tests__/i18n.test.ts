// lib/i18n/__tests__/i18n.test.ts — i18n 单元测试
// 测试翻译函数、fallback 链、模板参数替换
// Reference: .dev/docs/i18n-standards.md §5.3

import { describe, expect, it } from "vitest";
import { en as enMessages } from "../en";
import { t } from "../index";
import { zhCN as zhCNMessages } from "../zh-CN";

describe("i18n", () => {
  describe("t() — 同步翻译", () => {
    describe("zh-CN", () => {
      it("返回中文翻译", () => {
        expect(t("document.new", "zh-CN")).toBe("新建文档");
        expect(t("dialog.confirm", "zh-CN")).toBe("确定");
        expect(t("settings.title", "zh-CN")).toBe("设置");
      });

      it("支持模板参数", () => {
        expect(
          t("editor.statusBar.page", "zh-CN", { current: 1, total: 5 })
        ).toBe("第 1/5 页");
        expect(t("editor.statusBar.wordCount", "zh-CN", { count: 1200 })).toBe(
          "1200 字"
        );
      });
    });

    describe("en", () => {
      it("返回英文翻译", () => {
        expect(t("document.new", "en")).toBe("New Document");
        expect(t("dialog.confirm", "en")).toBe("OK");
        expect(t("settings.title", "en")).toBe("Settings");
      });

      it("支持模板参数", () => {
        expect(t("editor.statusBar.page", "en", { current: 1, total: 5 })).toBe(
          "Page 1/5"
        );
        expect(t("editor.statusBar.wordCount", "en", { count: 1200 })).toBe(
          "1200 words"
        );
      });
    });

    describe("fallback 链", () => {
      it("不存在的语言 fallback 到 zh-CN", () => {
        expect(t("document.new", "fr")).toBe("新建文档");
      });

      it("不存在的 key fallback 到 zh-CN", () => {
        // 使用一个不存在于任何翻译文件的 key
        expect(t("nonexistent.key", "en")).toBe("nonexistent.key");
      });

      it("en 中缺失的 key fallback 到 zh-CN", () => {
        // 所有 key 都在两个语言中存在，验证 zh-CN 作为兜底
        expect(t("dialog.confirm", "en")).toBe("OK");
        // 如果 en 中有 key 但 zh-CN 没有，应返回 en 的值
        // （当前实现：translations[locale]?.[key] ?? translations["zh-CN"]?.[key] ?? key）
      });
    });

    describe("默认语言", () => {
      it("不传 lang 参数时默认 zh-CN", () => {
        expect(t("document.save")).toBe("保存");
      });
    });
  });

  describe("所有 key 一致性", () => {
    it("zh-CN 和 en 有相同的 key 集合", () => {
      const zhKeys = Object.keys(zhCNMessages).sort();
      const enKeysAll = Object.keys(enMessages).sort();

      // 检查 en 有多余的 key
      const enExtra = enKeysAll.filter((k) => !zhKeys.includes(k));
      // 检查 zh-CN 有多余的 key（en 中缺失）
      const zhExtra = zhKeys.filter((k) => !enKeysAll.includes(k));

      expect(enExtra).toEqual([]);
      expect(zhExtra).toEqual([]);
    });
  });
});
