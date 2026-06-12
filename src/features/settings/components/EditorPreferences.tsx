// features/settings/components/EditorPreferences.tsx — 编辑器偏好区域 (Editor Preferences Section)
// 主题/语言/默认字号/自动保存/拼写检查
// Reference: .dev/docs/modules/features/settings.md §2, FRS F-060~062

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
import { useSettings } from "../hooks/useSettings";

const THEME_OPTIONS = [
  { value: "system", labelKey: "settings.editor.themeSystem" },
  { value: "light", labelKey: "settings.editor.themeLight" },
  { value: "dark", labelKey: "settings.editor.themeDark" },
] as const;

const LOCALE_OPTIONS = [
  { value: "zh-CN", labelKey: "settings.editor.languageChinese" },
  { value: "en", labelKey: "settings.editor.languageEnglish" },
] as const;

const FONT_SIZE_OPTIONS = [
  { value: "14", label: "14px" },
  { value: "15", label: "15px" },
  { value: "16", label: "16px" },
  { value: "18", label: "18px" },
] as const;

/**
 * 编辑器偏好区域。
 * 包含主题、语言、默认字号、自动保存、拼写检查。
 */
export function EditorPreferences() {
  const { t } = useT();
  const { editorConfig, saveEditorConfig } = useSettings();

  const handleThemeChange = useCallback(
    (value: string) => {
      saveEditorConfig({
        theme: value as "light" | "dark" | "system",
      });
    },
    [saveEditorConfig]
  );

  const handleLocaleChange = useCallback(
    (value: string) => {
      saveEditorConfig({ locale: value });
    },
    [saveEditorConfig]
  );

  const handleFontSizeChange = useCallback(
    (value: string) => {
      saveEditorConfig({ defaultFontSize: Number(value) });
    },
    [saveEditorConfig]
  );

  return (
    <section className="mb-6">
      <h3 className="mb-4 font-semibold text-base">
        {t("settings.editor.title")}
      </h3>

      {/* 主题 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.editor.theme")}
        </span>
        <Select onValueChange={handleThemeChange} value={editorConfig.theme}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 语言 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.editor.language")}
        </span>
        <Select onValueChange={handleLocaleChange} value={editorConfig.locale}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 默认字号 */}
      <div className="mb-4">
        <span className="mb-1.5 block font-medium text-muted-foreground text-sm">
          {t("settings.editor.fontSize")}
        </span>
        <Select
          onValueChange={handleFontSizeChange}
          value={String(editorConfig.defaultFontSize)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 自动保存 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">
            {t("settings.editor.autoSave")}
          </span>
          <p className="text-muted-foreground text-xs">
            {t("settings.editor.autoSaveDesc")}
          </p>
        </div>
        <Toggle
          aria-label={t("settings.editor.autoSave")}
          onPressedChange={(pressed) => saveEditorConfig({ autoSave: pressed })}
          pressed={editorConfig.autoSave}
        />
      </div>

      {/* 拼写检查 */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">
            {t("settings.editor.spellCheck")}
          </span>
          <p className="text-muted-foreground text-xs">
            {t("settings.editor.spellCheckDesc")}
          </p>
        </div>
        <Toggle
          aria-label={t("settings.editor.spellCheck")}
          onPressedChange={(pressed) =>
            saveEditorConfig({ spellCheck: pressed })
          }
          pressed={editorConfig.spellCheck}
        />
      </div>
    </section>
  );
}
