// features/settings/components/ApiKeySection.tsx — API Key 配置区域 (API Key Configuration Section)
// Provider 选择 + Key 输入 + Base URL + 模型选择 + 连接测试
// Reference: .dev/docs/modules/features/settings.md §2, FRS F-150~153

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import type { ApiProvider } from "@/stores/useSettingsStore";
import { useSettings } from "../hooks/useSettings";
import type { ConnectionTestState } from "../types";
import { maskKey } from "../types";

/** Provider 选项 */
const PROVIDERS: { value: ApiProvider; labelKey: string }[] = [
  { value: "anthropic", labelKey: "Anthropic" },
  { value: "openai-completions", labelKey: "OpenAI Completions" },
  { value: "openai-responses", labelKey: "OpenAI Responses" },
  { value: "custom", labelKey: "settings.apiKey.custom" },
];

/** 模型选项 */
const MODELS: { value: string; labelKey: string }[] = [
  { value: "claude-sonnet-4", labelKey: "Claude Sonnet 4" },
  { value: "claude-opus-4", labelKey: "Claude Opus 4" },
  { value: "gpt-4o", labelKey: "GPT-4o" },
  { value: "gpt-4.1", labelKey: "GPT-4.1" },
  { value: "gemini-2.5-pro", labelKey: "Gemini 2.5 Pro" },
  { value: "deepseek-v3", labelKey: "DeepSeek V3" },
];

/**
 * API Key 配置区域。
 * 包含 Provider 选择、Key 输入（密码框）、Base URL、模型选择、连接测试。
 */
export function ApiKeySection() {
  const { t } = useT();
  const { apiConfig, saveApiConfig, testConnection } = useSettings();

  const [showKey, setShowKey] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionTestState>("idle");
  const [connectionError, setConnectionError] = useState<string>("");

  const handleProviderChange = useCallback(
    (value: string) => {
      saveApiConfig({ provider: value as ApiProvider });
    },
    [saveApiConfig]
  );

  const handleKeyChange = useCallback(
    (value: string) => {
      saveApiConfig({ apiKey: value });
    },
    [saveApiConfig]
  );

  const handleBaseUrlChange = useCallback(
    (value: string) => {
      saveApiConfig({ baseUrl: value });
    },
    [saveApiConfig]
  );

  const handleModelChange = useCallback(
    (value: string) => {
      saveApiConfig({ model: value });
    },
    [saveApiConfig]
  );

  const handleTestConnection = useCallback(async () => {
    setConnectionState("testing");
    setConnectionError("");

    try {
      const success = await testConnection();
      setConnectionState(success ? "success" : "failed");
      if (!success) {
        setConnectionError(t("settings.apiKey.failed"));
      }
    } catch {
      setConnectionState("failed");
      setConnectionError(t("settings.apiKey.failed"));
    }
  }, [testConnection, t]);

  const displayKey = (() => {
    if (showKey) {
      return apiConfig.apiKey;
    }
    if (!apiConfig.apiKey) {
      return "";
    }
    const masked = maskKey(apiConfig.apiKey);
    return `${masked.prefix}…${masked.suffix}`;
  })();

  return (
    <section className="mb-6">
      <h3 className="mb-4 font-semibold text-base">{t("settings.apiKey")}</h3>

      {/* Provider 选择 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.apiKey.type")}
        </span>
        <Select onValueChange={handleProviderChange} value={apiConfig.provider}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.labelKey}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* API Key 输入 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.apiKey.key")}
        </span>
        <div className="flex gap-2">
          <Input
            autoComplete="off"
            className="flex-1"
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder={t("settings.apiKey.keyPlaceholder")}
            type={showKey ? "text" : "password"}
            value={displayKey}
          />
          <Button
            aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
            onClick={() => setShowKey((v) => !v)}
            size="icon"
            type="button"
            variant="outline"
          >
            {showKey ? "🙈" : "👁"}
          </Button>
        </div>
      </div>

      {/* Base URL */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.apiKey.baseUrl")}
        </span>
        <Input
          onChange={(e) => handleBaseUrlChange(e.target.value)}
          placeholder={t("settings.apiKey.baseUrlPlaceholder")}
          type="text"
          value={apiConfig.baseUrl}
        />
      </div>

      {/* 模型选择 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.apiKey.model")}
        </span>
        <Select onValueChange={handleModelChange} value={apiConfig.model}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.labelKey}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 连接测试 */}
      <div className="flex items-center gap-3">
        <Button
          disabled={connectionState === "testing" || !apiConfig.apiKey}
          onClick={handleTestConnection}
          type="button"
          variant="outline"
        >
          {connectionState === "testing"
            ? t("settings.apiKey.testing")
            : t("settings.apiKey.test")}
        </Button>

        {connectionState === "success" && (
          <span className="font-medium text-green-600 text-sm">
            ✓ {t("settings.apiKey.success")}
          </span>
        )}
        {connectionState === "failed" && (
          <span className="font-medium text-destructive text-sm">
            ✕ {connectionError}
          </span>
        )}
      </div>
    </section>
  );
}
