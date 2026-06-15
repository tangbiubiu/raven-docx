// pages/WorkspacePage.tsx — 编辑器主页面 (Workspace Page)
// 单页面应用的唯一页面，编排所有面板和弹层
// Reference: .dev/docs/modules/pages/workspace-page.md

import { useEffect, useRef } from "react";
import { EditorPane } from "@/features/editor/components/EditorPane";
import { StatusBar } from "@/features/editor/components/StatusBar";
import { SettingsDrawer } from "@/features/settings/components/SettingsDrawer";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * WorkspacePage — 编辑器主页面。
 *
 * Phase 2 状态：编辑器核心集成完成。
 * 后续 Phase 将逐步填充 TitleBar、Toolbar、AgentSidebar 等。
 */
export default function WorkspacePage() {
  const settingsDrawerOpen = useAppStore((s) => s.settingsDrawerOpen);
  const toggleSettingsDrawer = useAppStore((s) => s.toggleSettingsDrawer);
  const setSettingsDrawerOpen = useAppStore((s) => s.setSettingsDrawerOpen);

  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const hasApiKey = useSettingsStore((s) => !!s.apiConfig.apiKey);

  // 确保首次启动自动打开仅触发一次
  const autoOpenedRef = useRef(false);

  // 首次启动自动打开 SettingsDrawer 并定位到 ApiKeySection（TSS §4.4.4）
  useEffect(() => {
    if (isLoaded && !hasApiKey && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSettingsDrawerOpen(true);
    }
  }, [isLoaded, hasApiKey, setSettingsDrawerOpen]);

  const initialSection = hasApiKey ? undefined : ("apiKey" as const);

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* 标题栏占位 — Phase 3 实现 TitleBar */}
      <header className="flex h-10 shrink-0 items-center border-border border-b px-3">
        <span className="font-medium text-muted-foreground text-sm">
          geex-docx
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-accent"
            onClick={toggleSettingsDrawer}
            type="button"
          >
            {hasApiKey ? "设置" : "配置 API Key"}
          </button>
        </div>
      </header>

      {/* 主内容区 — DocxEditor */}
      <main className="flex flex-1 overflow-hidden">
        <EditorPane />
      </main>

      {/* 状态栏 — 页码/字数/缩放/保存状态 */}
      <StatusBar />

      {/* SettingsDrawer */}
      {settingsDrawerOpen ? (
        <SettingsDrawer initialSection={initialSection} />
      ) : null}
    </div>
  );
}
