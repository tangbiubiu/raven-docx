// biome-ignore-all lint/style/useBlockStatements: concise one-line mockIPC handlers
// features/settings/__tests__/useSettings.test.ts — useSettings Hook 测试
// Reference: .dev/docs/modules/features/settings.md §3

import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSettings } from "../hooks/useSettings";

describe("useSettings", () => {
  beforeEach(() => {
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") return;
      if (cmd === "set_api_key") return null;
      if (cmd === "get_api_key_masked") return "sk-a***b12c";
      if (cmd === "delete_api_key") return null;
      if (cmd === "agent_test_connection") return true;
      if (cmd === "clear_sessions") return null;
      if (cmd === "clear_autosave") return null;
      return null;
    });
    localStorage.clear();
    useSettingsStore.getState().resetAll();
  });

  afterEach(() => {
    clearMocks();
  });

  describe("初始状态", () => {
    it("apiConfig 使用默认值", () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.apiConfig.provider).toBe("anthropic");
      expect(result.current.apiConfig.model).toBe("claude-sonnet-4");
      expect(result.current.apiConfig.apiKey).toBe("");
      expect(result.current.apiConfig.baseUrl).toBe("");
    });

    it("modelConfig 使用默认值", () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.modelConfig.thinking).toBe("auto");
      expect(result.current.modelConfig.streaming).toBe(true);
    });

    it("editorConfig 使用默认值", () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.editorConfig.theme).toBe("system");
      expect(result.current.editorConfig.locale).toBe("zh-CN");
      expect(result.current.editorConfig.defaultFontSize).toBe(15);
      expect(result.current.editorConfig.autoSave).toBe(true);
      expect(result.current.editorConfig.spellCheck).toBe(true);
    });

    it("isLoaded 初始为 false", () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.isLoaded).toBe(false);
    });
  });

  describe("saveApiConfig", () => {
    it("更新 provider 并调用 Keychain", async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.saveApiConfig({ provider: "openai-completions" });
      });
      expect(useSettingsStore.getState().apiConfig.provider).toBe(
        "openai-completions"
      );
    });

    it("更新 apiKey 并调用 Keychain", async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.saveApiConfig({ apiKey: "sk-test-key-12345" });
      });
      expect(useSettingsStore.getState().apiConfig.apiKey).toBe(
        "sk-test-key-12345"
      );
    });

    it("更新 baseUrl", async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.saveApiConfig({
          baseUrl: "https://custom.api.com",
        });
      });
      expect(useSettingsStore.getState().apiConfig.baseUrl).toBe(
        "https://custom.api.com"
      );
    });

    it("更新 model", async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.saveApiConfig({ model: "gpt-4o" });
      });
      expect(useSettingsStore.getState().apiConfig.model).toBe("gpt-4o");
    });
  });

  describe("saveModelConfig", () => {
    it("更新 thinking 模式", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveModelConfig({ thinking: "always" });
      });
      expect(useSettingsStore.getState().modelConfig.thinking).toBe("always");
    });

    it("更新 streaming 开关", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveModelConfig({ streaming: false });
      });
      expect(useSettingsStore.getState().modelConfig.streaming).toBe(false);
    });
  });

  describe("saveEditorConfig", () => {
    it("更新主题", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveEditorConfig({ theme: "dark" });
      });
      expect(useSettingsStore.getState().editorConfig.theme).toBe("dark");
    });

    it("更新语言", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveEditorConfig({ locale: "en" });
      });
      expect(useSettingsStore.getState().editorConfig.locale).toBe("en");
    });

    it("更新默认字号", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveEditorConfig({ defaultFontSize: 18 });
      });
      expect(useSettingsStore.getState().editorConfig.defaultFontSize).toBe(18);
    });

    it("更新自动保存", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveEditorConfig({ autoSave: false });
      });
      expect(useSettingsStore.getState().editorConfig.autoSave).toBe(false);
    });

    it("更新拼写检查", () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.saveEditorConfig({ spellCheck: false });
      });
      expect(useSettingsStore.getState().editorConfig.spellCheck).toBe(false);
    });
  });

  describe("testConnection", () => {
    it("连接成功返回 true", async () => {
      const { result } = renderHook(() => useSettings());
      let success = false;
      await act(async () => {
        success = await result.current.testConnection();
      });
      expect(success).toBe(true);
    });

    it("连接失败返回 false", async () => {
      clearMocks();
      mockIPC((cmd) => {
        if (cmd === "plugin:log|log") return;
        if (cmd === "agent_test_connection")
          throw new Error("Connection refused");
        return null;
      });

      const { result } = renderHook(() => useSettings());
      let success = true;
      await act(async () => {
        success = await result.current.testConnection();
      });
      expect(success).toBe(false);
    });
  });

  describe("resetAllSettings", () => {
    it("重置所有设置到默认值", async () => {
      const { result } = renderHook(() => useSettings());
      // 先修改设置
      await act(async () => {
        await result.current.saveApiConfig({ provider: "openai-completions" });
      });
      act(() => {
        result.current.saveModelConfig({ thinking: "never" });
        result.current.saveEditorConfig({ theme: "dark" });
      });

      // 验证已修改
      expect(useSettingsStore.getState().apiConfig.provider).toBe(
        "openai-completions"
      );

      // 重置
      await act(async () => {
        await result.current.resetAllSettings();
      });

      // 验证已重置
      expect(useSettingsStore.getState().apiConfig.provider).toBe("anthropic");
      expect(useSettingsStore.getState().modelConfig.thinking).toBe("auto");
      expect(useSettingsStore.getState().editorConfig.theme).toBe("system");
    });
  });
});
