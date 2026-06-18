// useSettingsStore — 全局设置 (Global Settings)
// 管理 API 配置、模型配置、编辑器偏好，支持异步持久化
// Reference: .dev/docs/modules/stores.md §4

import { create } from "zustand";
import { logger } from "@/lib/logger";

/**
 * API 提供商类型
 */
export type ApiProvider =
  | "openai-completions"
  | "openai-responses"
  | "anthropic"
  | "custom";

/**
 * API 配置
 */
export type ApiConfig = {
  provider: ApiProvider;
  apiKey: string; // 运行时从 Keychain 加载，持久化到 localStorage 时 mask 处理
  baseUrl: string; // 自定义 API 端点
  model: string; // 默认模型
};

/**
 * 推理模式
 */
export type ThinkingMode = "auto" | "always" | "never";

/**
 * 模型配置
 */
export type ModelConfig = {
  thinking: ThinkingMode;
  streaming: boolean; // 流式输出
};

/**
 * 编辑器配置
 */
export type EditorConfig = {
  theme: "light" | "dark" | "system";
  locale: string; // "zh-CN" | "en"
  defaultFontSize: number; // 默认字号
  autoSave: boolean; // 自动保存
  spellCheck: boolean; // 拼写检查
};

/**
 * 设置状态
 */
export type SettingsState = {
  isLoaded: boolean;
  apiConfig: ApiConfig;
  modelConfig: ModelConfig;
  editorConfig: EditorConfig;

  setApiConfig(config: Partial<ApiConfig>): void;
  setModelConfig(config: Partial<ModelConfig>): void;
  setEditorConfig(config: Partial<EditorConfig>): void;
  loadFromStorage(): Promise<void>;
  persist(): Promise<void>;
  resetAll(): void;
};

/** localStorage 键名 */
const STORAGE_KEY = "raven:settings";

/** 默认 API 配置 */
const DEFAULT_API_CONFIG: ApiConfig = {
  provider: "anthropic",
  apiKey: "",
  baseUrl: "",
  model: "claude-sonnet-4",
};

/** 默认模型配置 */
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  thinking: "auto",
  streaming: true,
};

/** 默认编辑器配置 */
const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  theme: "system",
  locale: "zh-CN",
  defaultFontSize: 15,
  autoSave: true,
  spellCheck: true,
};

/**
 * 将 apiKey 脱敏后存储。
 * 格式：保留前 4 和后 4 字符，中间用 "…" 代替。
 * 长度不足 8 的 key 全部 mask。
 */
function maskApiKey(key: string): string {
  if (!key) {
    return "";
  }
  if (key.length <= 8) {
    return "****";
  }
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * 是否为脱敏后的 apiKey 格式。
 */
function isMaskedKey(key: string): boolean {
  return key.includes("…") || key === "****";
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isLoaded: false,

  apiConfig: { ...DEFAULT_API_CONFIG },
  modelConfig: { ...DEFAULT_MODEL_CONFIG },
  editorConfig: { ...DEFAULT_EDITOR_CONFIG },

  setApiConfig(config) {
    set((state) => ({
      apiConfig: { ...state.apiConfig, ...config },
    }));
  },

  setModelConfig(config) {
    set((state) => ({
      modelConfig: { ...state.modelConfig, ...config },
    }));
  },

  setEditorConfig(config) {
    set((state) => ({
      editorConfig: { ...state.editorConfig, ...config },
    }));
  },

  async loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);

        if (parsed.apiConfig) {
          set((state) => ({
            apiConfig: {
              ...state.apiConfig,
              ...parsed.apiConfig,
              apiKey: parsed.apiConfig.apiKey || "",
            },
          }));
        }

        if (parsed.modelConfig) {
          set((state) => ({
            modelConfig: { ...state.modelConfig, ...parsed.modelConfig },
          }));
        }

        if (parsed.editorConfig) {
          set((state) => ({
            editorConfig: { ...state.editorConfig, ...parsed.editorConfig },
          }));
        }
      }
    } catch (err) {
      logger.warn(`Failed to load settings from localStorage: ${String(err)}`);
    } finally {
      set({ isLoaded: true });
    }
    // Ensure the function is genuinely async for the interface contract
    await Promise.resolve();
  },

  async persist() {
    try {
      const state = get();
      const toPersist = {
        apiConfig: {
          ...state.apiConfig,
          apiKey: isMaskedKey(state.apiConfig.apiKey)
            ? state.apiConfig.apiKey
            : maskApiKey(state.apiConfig.apiKey),
        },
        modelConfig: state.modelConfig,
        editorConfig: state.editorConfig,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch (err) {
      logger.error(
        `Failed to persist settings to localStorage: ${String(err)}`
      );
    }
    await Promise.resolve();
  },

  resetAll() {
    set({
      apiConfig: { ...DEFAULT_API_CONFIG },
      modelConfig: { ...DEFAULT_MODEL_CONFIG },
      editorConfig: { ...DEFAULT_EDITOR_CONFIG },
    });
    get().persist();
  },
}));
