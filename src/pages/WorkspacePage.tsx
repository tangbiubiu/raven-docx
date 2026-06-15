// pages/WorkspacePage.tsx — 编辑器主页面 (Workspace Page)
// 单页面应用的唯一页面，编排所有面板和弹层
// Reference: .dev/docs/modules/pages/workspace-page.md

import { useEffect, useRef } from "react";
import { DocumentTitleBar } from "@/features/document/components/document-title-bar";
import { useDocument } from "@/features/document/hooks/useDocument";
import { EditorPane } from "@/features/editor/components/EditorPane";
import { OutlinePanel } from "@/features/editor/components/OutlinePanel";
import { Ruler } from "@/features/editor/components/Ruler";
import { StatusBar } from "@/features/editor/components/StatusBar";
import { Toolbar } from "@/features/formatting/components/toolbar";
import type { MenuBarCallbacks } from "@/features/menubar/components/menu-bar";
import { MenuBar } from "@/features/menubar/components/menu-bar";
import { SettingsDrawer } from "@/features/settings/components/SettingsDrawer";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

/**
 * WorkspacePage — 编辑器主页面。
 *
 * 布局层次（对齐原型图）：
 *  DocumentTitleBar → MenuBar → Toolbar → Main(Outline | Ruler+Editor) → StatusBar
 */
export default function WorkspacePage() {
  const settingsDrawerOpen = useAppStore((s) => s.settingsDrawerOpen);
  const toggleSettingsDrawer = useAppStore((s) => s.toggleSettingsDrawer);
  const setSettingsDrawerOpen = useAppStore((s) => s.setSettingsDrawerOpen);
  const toggleOutlinePanel = useAppStore((s) => s.toggleOutlinePanel);

  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const hasApiKey = useSettingsStore((s) => !!s.apiConfig.apiKey);

  const documentBuffer = useDocumentStore((s) => s.documentBuffer);
  const isNewDocument = useDocumentStore((s) => s.isNewDocument);
  const zoom = useDocumentStore((s) => s.zoom);
  const setZoom = useDocumentStore((s) => s.setZoom);

  const { newDocument, openDocument, saveDocument } = useDocument();

  // 确保首次启动自动打开仅触发一次
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && !hasApiKey && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSettingsDrawerOpen(true);
    }
  }, [isLoaded, hasApiKey, setSettingsDrawerOpen]);

  const initialSection = hasApiKey ? undefined : ("apiKey" as const);

  // MenuBar 回调
  const menuCallbacks: MenuBarCallbacks = {
    onNew: newDocument,
    onOpen: openDocument,
    onSave: saveDocument,
    onZoomIn: () => setZoom(Math.min(zoom + ZOOM_STEP, ZOOM_MAX)),
    onZoomOut: () => setZoom(Math.max(zoom - ZOOM_STEP, ZOOM_MIN)),
    onToggleOutline: toggleOutlinePanel,
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* 文档标题栏 — 文件操作 + 文档状态 + 主题切换 */}
      <div className="flex shrink-0 items-center">
        <div className="flex-1">
          <DocumentTitleBar onNew={newDocument} onOpen={openDocument} />
        </div>
        <div className="flex items-center gap-1 pr-3">
          <ThemeToggle />
          <button
            className="rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-accent"
            onClick={toggleSettingsDrawer}
            type="button"
          >
            {hasApiKey ? "设置" : "配置 API Key"}
          </button>
        </div>
      </div>

      {/* 菜单栏 */}
      <MenuBar {...menuCallbacks} />

      {/* 主内容区 — OutlinePanel + Ruler + DocxEditor */}
      <main className="flex flex-1 overflow-hidden">
        <OutlinePanel />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <Toolbar />
          <Ruler />
          <EditorPane
            documentBuffer={documentBuffer}
            isNewDocument={isNewDocument}
          />
        </div>
      </main>

      {/* 状态栏 */}
      <StatusBar />

      {/* SettingsDrawer */}
      {settingsDrawerOpen ? (
        <SettingsDrawer initialSection={initialSection} />
      ) : null}
    </div>
  );
}
