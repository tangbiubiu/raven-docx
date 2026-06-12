// features/settings/components/ModelSettings.tsx — 模型设置区域 (Model Settings Section)
// 推理模式 + 流式输出开关
// Reference: .dev/docs/modules/features/settings.md §2

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/i18n";
import type { ThinkingMode } from "@/stores/useSettingsStore";
import { useSettings } from "../hooks/useSettings";

const THINKING_OPTIONS: { value: ThinkingMode; labelKey: string }[] = [
  { value: "auto", labelKey: "settings.model.thinkingAuto" },
  { value: "always", labelKey: "settings.model.thinkingAlways" },
  { value: "never", labelKey: "settings.model.thinkingNever" },
];

/**
 * 模型设置区域。
 * 包含推理模式选择和流式输出开关。
 */
export function ModelSettings() {
  const { t } = useT();
  const { modelConfig, saveModelConfig } = useSettings();

  const handleThinkingChange = useCallback(
    (value: string) => {
      saveModelConfig({ thinking: value as ThinkingMode });
    },
    [saveModelConfig]
  );

  const handleStreamingToggle = useCallback(() => {
    saveModelConfig({ streaming: !modelConfig.streaming });
  }, [modelConfig.streaming, saveModelConfig]);

  return (
    <section className="mb-6">
      <h3 className="mb-4 font-semibold text-base">
        {t("settings.model.title")}
      </h3>

      {/* 推理模式 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.model.thinking")}
        </span>
        <Select
          onValueChange={handleThinkingChange}
          value={modelConfig.thinking}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THINKING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 流式输出 */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">
            {t("settings.model.streaming")}
          </span>
          <p className="text-muted-foreground text-xs">
            {t("settings.model.streamingDesc")}
          </p>
        </div>
        <Toggle
          aria-label={t("settings.model.streaming")}
          onPressedChange={handleStreamingToggle}
          pressed={modelConfig.streaming}
        />
      </div>
    </section>
  );
}
