// features/settings/types.ts — 设置功能共享类型 (Settings Feature Shared Types)
// Reference: .dev/docs/modules/features/settings.md §4

export type {
  ApiConfig,
  ApiProvider,
  EditorConfig,
  ModelConfig,
  ThinkingMode,
} from "@/stores/useSettingsStore";

/** 连接测试状态 */
export type ConnectionTestState = "idle" | "testing" | "success" | "failed";

/** API Key 脱敏显示格式 */
export type MaskedKey = {
  prefix: string;
  suffix: string;
};

/** 从完整 Key 生成脱敏显示 */
export function maskKey(key: string): MaskedKey {
  if (key.length <= 8) {
    return { prefix: "****", suffix: "" };
  }
  return {
    prefix: key.slice(0, 4),
    suffix: key.slice(-4),
  };
}

/** 判断给定字符串是否为脱敏格式 */
export function isMasked(key: string): boolean {
  return key.includes("…") || key === "****";
}
