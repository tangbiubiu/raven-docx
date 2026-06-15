// pages/WorkspacePage.tsx — 编辑器主页面 (Workspace Page)
// 单页面应用的唯一页面，编排所有面板和弹层
// Reference: .dev/docs/modules/pages/workspace-page.md

import { useEffect, useRef } from "react";
import { DocumentTitleBar } from "@/features/document/components/DocumentTitleBar";
import { useDocument } from "@/features/document/hooks/useDocument";
import { EditorPane } from "@/features/editor/components/EditorPane";
import { OutlinePanel } from "@/features/editor/components/OutlinePanel";
import { StatusBar } from "@/features/editor/components/StatusBar";
import { SettingsDrawer } from "@/features/settings/components/SettingsDrawer";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * WorkspacePage — 编辑器主页面。
 *
 * Phase 2：集成 DocumentTitleBar + useDocument，将文档状态传入 EditorPane。
 */
export default function WorkspacePage() {
  const settingsDrawerOpen = useAppStore((s) => s.settingsDrawerOpen);
  const toggleSettingsDrawer = useAppStore((s) => s.toggleSettingsDrawer);
  const setSettingsDrawerOpen = useAppStore((s) => s.setSettingsDrawerOpen);

  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const hasApiKey = useSettingsStore((s) => !!s.apiConfig.apiKey);

  const documentBuffer = useDocumentStore((s) => s.documentBuffer);
  const isNewDocument = useDocumentStore((s) => s.isNewDocument);

  const { newDocument, openDocument } = useDocument();

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
      {/* 文档标题栏 — 文件操作 + 文档状态 */}
      <DocumentTitleBar onNew={newDocument} onOpen={openDocument} />

      {/* 设置入口 */}
      <div className="flex shrink-0 items-center justify-end border-border border-b px-3 py-1">
        <button
          className="rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-accent"
          onClick={toggleSettingsDrawer}
          type="button"
        >
          {hasApiKey ? "设置" : "配置 API Key"}
        </button>
      </div>

      {/* 主内容区 — OutlinePanel + DocxEditor */}
      <main className="flex flex-1 overflow-hidden">
        <OutlinePanel />
        <EditorPane
          documentBuffer={documentBuffer}
          isNewDocument={isNewDocument}
        />
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
