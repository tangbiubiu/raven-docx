// features/settings/components/SettingsDrawer.tsx — 设置侧边抽屉面板 (Settings Drawer Panel)
// 从 WorkspacePage 右侧滑出，集中管理所有应用配置
// Reference: .dev/docs/modules/pages/settings-drawer.md

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import { ApiKeySection } from "./ApiKeySection";
import { DataManagement } from "./DataManagement";
import { EditorPreferences } from "./EditorPreferences";
import { ModelSettings } from "./ModelSettings";

export type SettingsDrawerProps = {
  /** 初始滚动到的区域 ID（用于首次启动自动定位） */
  initialSection?: "apiKey" | "model" | "editor" | "data";
};

/**
 * 设置侧边抽屉面板。
 * 从右侧滑出，包含 API Key、模型、编辑器偏好、数据管理四个区域。
 */
export function SettingsDrawer({ initialSection }: SettingsDrawerProps) {
  const { t } = useT();
  const close = useAppStore((s) => s.setSettingsDrawerOpen);
  const apiKeySectionRef = useRef<HTMLDivElement>(null);

  // 首次启动自动滚动到 ApiKeySection
  if (initialSection === "apiKey" && apiKeySectionRef.current) {
    // scrollIntoView 在 jsdom 测试环境中不可用，添加容错
    apiKeySectionRef.current.scrollIntoView?.({ behavior: "smooth" });
  }

  // Escape 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  return (
    <>
      {/* 遮罩层 — 点击关闭 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/35 transition-opacity"
        onClick={() => close(false)}
      />

      {/* 抽屉面板 */}
      <div
        aria-label={t("settings.title")}
        className="slide-in-from-right fixed top-0 right-0 z-50 flex h-full w-[380px] animate-in flex-col border-border border-l bg-background shadow-2xl"
        role="dialog"
      >
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-border border-b px-5 py-4">
          <h2 className="font-semibold text-lg">{t("settings.title")}</h2>
          <button
            className="rounded-md px-3 py-1.5 font-medium text-primary text-sm hover:bg-accent"
            onClick={() => close(false)}
            type="button"
          >
            {t("settings.close")}
          </button>
        </div>

        {/* 滚动内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div ref={apiKeySectionRef}>
            <ApiKeySection />
          </div>
          <ModelSettings />
          <EditorPreferences />
          <DataManagement />
        </div>
      </div>
    </>
  );
}
