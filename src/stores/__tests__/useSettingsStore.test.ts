// stores/__tests__/useSettingsStore.test.ts — 全局设置 Store 单元测试
// Reference: .dev/docs/modules/stores.md §4

import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "../useSettingsStore";

/** localStorage reference — backed by vitest setup mock */
const ls = localStorage;

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetAll();
    ls.clear();
  });

  describe("初始状态", () => {
    it("isLoaded 初始为 false", () => {
      expect(useSettingsStore.getState().isLoaded).toBe(false);
    });

    it("apiConfig 有默认值", () => {
      const config = useSettingsStore.getState().apiConfig;
      expect(config.provider).toBe("anthropic");
      expect(config.apiKey).toBe("");
      expect(config.baseUrl).toBe("");
      expect(config.model).toBe("claude-sonnet-4");
    });

    it("modelConfig 有默认值", () => {
      const config = useSettingsStore.getState().modelConfig;
      expect(config.thinking).toBe("auto");
      expect(config.streaming).toBe(true);
    });

    it("editorConfig 有默认值", () => {
      const config = useSettingsStore.getState().editorConfig;
      expect(config.theme).toBe("system");
      expect(config.locale).toBe("zh-CN");
      expect(config.defaultFontSize).toBe(15);
      expect(config.autoSave).toBe(true);
      expect(config.spellCheck).toBe(true);
    });
  });

  describe("setApiConfig", () => {
    it("部分更新 apiConfig", () => {
      useSettingsStore
        .getState()
        .setApiConfig({ provider: "openai-completions" });
      expect(useSettingsStore.getState().apiConfig.provider).toBe(
        "openai-completions"
      );
      expect(useSettingsStore.getState().apiConfig.model).toBe(
        "claude-sonnet-4"
      );
    });

    it("批量更新多个字段", () => {
      useSettingsStore.getState().setApiConfig({
        provider: "anthropic",
        model: "claude-opus-4",
        apiKey: "sk-test-key",
      });
      const config = useSettingsStore.getState().apiConfig;
      expect(config.provider).toBe("anthropic");
      expect(config.model).toBe("claude-opus-4");
      expect(config.apiKey).toBe("sk-test-key");
    });
  });

  describe("setModelConfig", () => {
    it("部分更新 modelConfig", () => {
      useSettingsStore.getState().setModelConfig({ streaming: false });
      expect(useSettingsStore.getState().modelConfig.streaming).toBe(false);
      expect(useSettingsStore.getState().modelConfig.thinking).toBe("auto");
    });
  });

  describe("setEditorConfig", () => {
    it("部分更新 editorConfig", () => {
      useSettingsStore.getState().setEditorConfig({ locale: "en" });
      expect(useSettingsStore.getState().editorConfig.locale).toBe("en");
      expect(useSettingsStore.getState().editorConfig.theme).toBe("system");
    });
  });

  describe("loadFromStorage", () => {
    it("从 localStorage 加载设置", async () => {
      const saved = {
        apiConfig: {
          provider: "openai-completions",
          apiKey: "sk-ab…xy12",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o",
        },
        modelConfig: { thinking: "always", streaming: false },
        editorConfig: {
          theme: "dark",
          locale: "en",
          defaultFontSize: 16,
          autoSave: false,
          spellCheck: false,
        },
      };
      ls.setItem("geex-docx:settings", JSON.stringify(saved));

      await useSettingsStore.getState().loadFromStorage();

      expect(useSettingsStore.getState().isLoaded).toBe(true);
      expect(useSettingsStore.getState().apiConfig.provider).toBe(
        "openai-completions"
      );
      expect(useSettingsStore.getState().apiConfig.model).toBe("gpt-4o");
      expect(useSettingsStore.getState().modelConfig.thinking).toBe("always");
      expect(useSettingsStore.getState().editorConfig.theme).toBe("dark");
      expect(useSettingsStore.getState().editorConfig.locale).toBe("en");
    });

    it("localStorage 为空时使用默认值", async () => {
      await useSettingsStore.getState().loadFromStorage();
      expect(useSettingsStore.getState().isLoaded).toBe(true);
      expect(useSettingsStore.getState().apiConfig.provider).toBe("anthropic");
    });

    it("localStorage 数据损坏时使用默认值", async () => {
      ls.setItem("geex-docx:settings", "invalid json{{{");
      await useSettingsStore.getState().loadFromStorage();
      expect(useSettingsStore.getState().isLoaded).toBe(true);
      expect(useSettingsStore.getState().apiConfig.provider).toBe("anthropic");
    });
  });

  describe("persist", () => {
    it("持久化设置到 localStorage", async () => {
      useSettingsStore.getState().setApiConfig({
        provider: "anthropic",
        apiKey: "sk-ant-api03-secretkey12345678",
      });
      useSettingsStore.getState().setEditorConfig({ locale: "en" });

      await useSettingsStore.getState().persist();

      const saved = JSON.parse(ls.getItem("geex-docx:settings") ?? "{}");
      expect(saved.apiConfig.provider).toBe("anthropic");
      expect(saved.apiConfig.apiKey).toContain("…");
      expect(saved.apiConfig.apiKey).not.toBe("sk-ant-api03-secretkey12345678");
      expect(saved.editorConfig.locale).toBe("en");
    });

    it("短 apiKey 完全 mask", async () => {
      useSettingsStore.getState().setApiConfig({ apiKey: "short" });
      await useSettingsStore.getState().persist();
      const saved = JSON.parse(ls.getItem("geex-docx:settings") ?? "{}");
      expect(saved.apiConfig.apiKey).toBe("****");
    });

    it("空 apiKey 不 mask", async () => {
      useSettingsStore.getState().setApiConfig({ apiKey: "" });
      await useSettingsStore.getState().persist();
      const saved = JSON.parse(ls.getItem("geex-docx:settings") ?? "{}");
      expect(saved.apiConfig.apiKey).toBe("");
    });
  });

  describe("resetAll", () => {
    it("重置所有设置到默认值", () => {
      useSettingsStore
        .getState()
        .setApiConfig({ provider: "openai-completions", model: "gpt-4o" });
      useSettingsStore
        .getState()
        .setEditorConfig({ theme: "dark", locale: "en" });

      useSettingsStore.getState().resetAll();

      const state = useSettingsStore.getState();
      expect(state.apiConfig.provider).toBe("anthropic");
      expect(state.apiConfig.model).toBe("claude-sonnet-4");
      expect(state.editorConfig.theme).toBe("system");
      expect(state.editorConfig.locale).toBe("zh-CN");
    });
  });
});
