// features/settings/components/SettingsDrawer.tsx — 设置侧边抽屉面板 (Settings Drawer Panel)
// 从 WorkspacePage 右侧滑出，集中管理所有应用配置
// p3: 自绘遮罩/抽屉 → 统一 radix Sheet(sheet.tsx 即为此面板封装)
// Reference: .dev/docs/modules/pages/settings-drawer.md

import { useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
 * Escape/遮罩点击由 radix Sheet 内置处理(此前为自绘监听)。
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

  return (
    <Sheet onOpenChange={(o) => !o && close(false)} open>
      <SheetContent
        className="w-[380px] gap-0 border-l sm:max-w-[380px]"
        data-testid="settings-drawer"
      >
        <SheetTitle className="shrink-0 border-border border-b px-5 py-4 text-lg">
          {t("settings.title")}
        </SheetTitle>

        {/* 滚动内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div ref={apiKeySectionRef}>
            <ApiKeySection />
          </div>
          <ModelSettings />
          <EditorPreferences />
          <DataManagement />
        </div>
      </SheetContent>
    </Sheet>
  );
}
