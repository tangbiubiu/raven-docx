// pages/WorkspacePage.tsx — 编辑器主页面 (Workspace Page)
// 单页面应用的唯一页面，编排所有面板和弹层
// Reference: .dev/docs/modules/pages/workspace-page.md

import { useEffect, useRef } from "react";
import { SettingsDrawer } from "@/features/settings/components/SettingsDrawer";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * WorkspacePage — 编辑器主页面。
 *
 * Phase 1 状态：布局壳，仅实现 SettingsDrawer toggle。
 * 后续 Phase 将逐步填充 TitleBar、Toolbar、EditorPane、AgentSidebar 等。
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
      {/* 标题栏占位 */}
      <header className="flex h-10 shrink-0 items-center border-border border-b px-3">
        <span className="font-medium text-muted-foreground text-sm">
          geex-docx
        </span>
      </header>

      {/* 主内容区 */}
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-semibold text-2xl">geex-docx</h1>
          <p className="mb-4 text-muted-foreground">Agent 原生文档编辑器</p>
          <button
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            onClick={toggleSettingsDrawer}
            type="button"
          >
            配置 API Key
          </button>
          <p className="mt-2 text-muted-foreground text-xs">
            或通过菜单栏 → 设置打开
          </p>
        </div>
      </main>

      {/* 状态栏占位 */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-border border-t bg-muted/30 px-3">
        <span className="text-muted-foreground text-xs">
          {hasApiKey ? "✓ Agent 就绪" : "⚠ 未配置 API Key"}
        </span>
        <span className="text-muted-foreground text-xs">v0.2.0</span>
      </footer>

      {/* SettingsDrawer */}
      {settingsDrawerOpen ? (
        <SettingsDrawer initialSection={initialSection} />
      ) : null}
    </div>
  );
}
