// features/settings/hooks/useSettings.ts — 设置读写 Hook (Settings Read/Write Hook)
// 封装 useSettingsStore 的读写操作，提供便捷 API
// Reference: .dev/docs/modules/features/settings.md §3

import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { commands } from "@/lib/bindings";
import { logger } from "@/lib/logger";
import type {
  ApiConfig,
  EditorConfig,
  ModelConfig,
} from "@/stores/useSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

// ===== Tauri Command 名称常量 =====
const CMD_SET_API_KEY = "set_api_key";
const CMD_GET_API_KEY_MASKED = "get_api_key_masked";
const CMD_DELETE_API_KEY = "delete_api_key";

/**
 * 设置读写 Hook。
 * 在 useSettingsStore 之上的便捷封装，处理 Keychain 交互和防抖。
 */
export function useSettings() {
  const apiConfig = useSettingsStore((s) => s.apiConfig);
  const modelConfig = useSettingsStore((s) => s.modelConfig);
  const editorConfig = useSettingsStore((s) => s.editorConfig);
  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const setApiConfig = useSettingsStore((s) => s.setApiConfig);
  const setModelConfig = useSettingsStore((s) => s.setModelConfig);
  const setEditorConfig = useSettingsStore((s) => s.setEditorConfig);
  const persist = useSettingsStore((s) => s.persist);

  /**
   * 保存 API 配置。
   * apiKey 会写入系统 Keychain，其余字段写入 localStorage。
   */
  const saveApiConfig = useCallback(
    async (config: Partial<ApiConfig>) => {
      setApiConfig(config);

      // 如果提供了 apiKey 且非空，写入 Keychain
      if (config.apiKey !== undefined) {
        try {
          await invoke(CMD_SET_API_KEY, {
            provider: config.provider ?? apiConfig.provider,
            key: config.apiKey,
          });
          logger.debug("API Key 已写入系统 Keychain");
        } catch (err) {
          logger.error(`写入 Keychain 失败: ${String(err)}`);
        }
      }

      await persist();
    },
    [apiConfig.provider, setApiConfig, persist]
  );

  /**
   * 保存模型配置
   */
  const saveModelConfig = useCallback(
    (config: Partial<ModelConfig>) => {
      setModelConfig(config);
      // 立即持久化（模型配置无 Keychain 交互）
      useSettingsStore.getState().persist();
    },
    [setModelConfig]
  );

  /**
   * 保存编辑器配置
   */
  const saveEditorConfig = useCallback(
    (config: Partial<EditorConfig>) => {
      setEditorConfig(config);
      // 立即持久化
      useSettingsStore.getState().persist();
    },
    [setEditorConfig]
  );

  /**
   * 测试 API 连接。
   * 调用 Tauri command `agent_test_connection`。
   *
   * @returns `true` 连接成功，`false` 失败
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const result = await commands.agentTestConnection(
        apiConfig.apiKey,
        apiConfig.baseUrl || null,
      );
      if (result.status === "ok") {
        return result.data;
      }
      logger.error(`连接测试失败: ${result.error}`);
      return false;
    } catch (err) {
      logger.error(`连接测试调用失败: ${String(err)}`);
      return false;
    }
  }, [apiConfig.apiKey, apiConfig.baseUrl]);

  /**
   * 从 Keychain 加载 API Key（masked）。
   * 用于初始化时从系统 Keychain 恢复 Key。
   */
  const loadMaskedKey = useCallback(
    async (provider: string): Promise<string> => {
      try {
        return await invoke<string>(CMD_GET_API_KEY_MASKED, { provider });
      } catch (err) {
        logger.debug(`从 Keychain 读取 Key 失败: ${String(err)}`);
        return "";
      }
    },
    []
  );

  /**
   * 从 Keychain 删除 API Key
   */
  const deleteKey = useCallback(async (provider: string): Promise<void> => {
    try {
      await invoke(CMD_DELETE_API_KEY, { provider });
      logger.debug(`已从 Keychain 删除 Key (provider: ${provider})`);
    } catch (err) {
      logger.error(`删除 Keychain 条目失败: ${String(err)}`);
    }
  }, []);

  /**
   * 清除对话历史
   */
  const clearChatHistory = useCallback(async (): Promise<void> => {
    try {
      await invoke("clear_sessions");
      logger.info("对话历史已清除");
    } catch (err) {
      logger.error(`清除对话历史失败: ${String(err)}`);
    }
  }, []);

  /**
   * 清除草稿
   */
  const clearDrafts = useCallback(async (): Promise<void> => {
    try {
      await invoke("clear_autosave");
      logger.info("草稿已清除");
    } catch (err) {
      logger.error(`清除草稿失败: ${String(err)}`);
    }
  }, []);

  /**
   * 重置所有设置
   */
  const resetAllSettings = useCallback(async (): Promise<void> => {
    // 删除 Keychain 中的 Key
    await deleteKey(apiConfig.provider);
    // 重置 store 到默认值
    useSettingsStore.getState().resetAll();
    logger.info("所有设置已重置");
  }, [apiConfig.provider, deleteKey]);

  return {
    // 状态
    apiConfig,
    modelConfig,
    editorConfig,
    isLoaded,

    // 写操作
    saveApiConfig,
    saveModelConfig,
    saveEditorConfig,

    // 连接测试
    testConnection,

    // Keychain
    loadMaskedKey,
    deleteKey,

    // 数据管理
    clearChatHistory,
    clearDrafts,
    resetAllSettings,
  };
}
