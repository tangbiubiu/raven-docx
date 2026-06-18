// pages/WorkspacePage.tsx — 编辑器主页面 (Workspace Page)
// 单页面应用的唯一页面，编排所有面板和弹层
// Reference: .dev/docs/modules/pages/workspace-page.md

import { useEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AgentSidebar } from "@/features/agent/components/agent-sidebar";
import { CommandPalette } from "@/features/agent/components/command-palette";
import { DocumentTitleBar } from "@/features/document/components/document-title-bar";
import { useAutoSave } from "@/features/document/hooks/use-auto-save";
import { useDocument } from "@/features/document/hooks/useDocument";
import { EditorPane } from "@/features/editor/components/EditorPane";
import { OutlinePanel } from "@/features/editor/components/OutlinePanel";
import { Ruler } from "@/features/editor/components/Ruler";
import { StatusBar } from "@/features/editor/components/StatusBar";
import { FindReplaceDialog } from "@/features/find-replace/components/find-replace-dialog";
import { Toolbar } from "@/features/formatting/components/toolbar";
import type { MenuBarCallbacks } from "@/features/menubar/components/menu-bar";
import { MenuBar } from "@/features/menubar/components/menu-bar";
import { HeaderFooterEditor } from "@/features/page-layout/components/HeaderFooterEditor";
import { PageSetupDialog } from "@/features/page-layout/components/PageSetupDialog";
import { SettingsDrawer } from "@/features/settings/components/SettingsDrawer";
import { VariableForm } from "@/features/template/components/variable-form";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

/**
 * AgentSidebar 错误回退 UI
 * 当 AgentSidebar 抛出异常时显示，避免整个工作区崩溃。
 * 使用 react-error-boundary 提供的 resetErrorBoundary 重置状态。
 */
function AgentSidebarErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div
      className="flex w-80 flex-col items-center justify-center gap-2 border-l bg-background p-4 text-center text-muted-foreground text-sm"
      role="alert"
    >
      <p className="font-medium">Agent 面板加载失败</p>
      <p className="text-xs">{error.message}</p>
      <button
        className="text-primary text-xs underline"
        onClick={resetErrorBoundary}
        type="button"
      >
        重试
      </button>
    </div>
  );
}

/**
 * WorkspacePage — 编辑器主页面。
 *
 * 布局层次（对齐原型图）：
 *  DocumentTitleBar → MenuBar → Toolbar → Main(Outline | Editor | AgentSidebar) → StatusBar
 */
export default function WorkspacePage() {
  const { t } = useT();
  const toggleOutlinePanel = useAppStore((s) => s.toggleOutlinePanel);
  const toggleAgentSidebar = useAppStore((s) => s.toggleAgentSidebar);
  const activeModal = useAppStore((s) => s.activeModal);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const setSettingsDrawerOpen = useAppStore((s) => s.setSettingsDrawerOpen);
  const toggleSettingsDrawer = useAppStore((s) => s.toggleSettingsDrawer);
  const settingsDrawerOpen = useAppStore((s) => s.settingsDrawerOpen);

  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const hasApiKey = useSettingsStore((s) => !!s.apiConfig.apiKey);

  const documentBuffer = useDocumentStore((s) => s.documentBuffer);
  const isNewDocument = useDocumentStore((s) => s.isNewDocument);
  const zoom = useDocumentStore((s) => s.zoom);
  const setZoom = useDocumentStore((s) => s.setZoom);

  const { newDocument, openDocument, saveDocument } = useDocument();
  useAutoSave();

  // 确保首次启动自动打开仅触发一次
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && !hasApiKey && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSettingsDrawerOpen(true);
    }
  }, [isLoaded, hasApiKey, setSettingsDrawerOpen]);
  // Cmd/Ctrl+K 打开命令面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        openModal("commandPalette");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openModal]);

  // Global keyboard shortcuts (全局快捷键)
  useEffect(() => {
    const handleFindReplace = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && !e.shiftKey) {
        e.preventDefault();
        openModal("findReplace");
      } else if (e.key.toLowerCase() === "h" && !e.shiftKey) {
        e.preventDefault();
        openModal("findReplace");
      }
    };

    const handlePrint = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        window.print();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        return;
      }

      handleFindReplace(e);
      handlePrint(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openModal]);

  const initialSection = hasApiKey ? undefined : ("apiKey" as const);

  // MenuBar 回调
  const menuCallbacks: MenuBarCallbacks = {
    onNew: newDocument,
    onOpen: openDocument,
    onSave: saveDocument,
    onZoomIn: () => setZoom(Math.min(zoom + ZOOM_STEP, ZOOM_MAX)),
    onZoomOut: () => setZoom(Math.max(zoom - ZOOM_STEP, ZOOM_MIN)),
    onToggleOutline: toggleOutlinePanel,
    onToggleAgentSidebar: toggleAgentSidebar,
    onPageSetup: () => openModal("pageSetup"),
    onHeaderFooter: () => openModal("headerFooter"),
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* 文档标题栏 — 文件操作 + 文档状态 + 主题切换 */}
      <div className="flex shrink-0 items-center">
        <div className="flex-1">
          <DocumentTitleBar />
        </div>
        <div className="flex items-center gap-1 pr-3">
          <button
            className="rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-accent"
            onClick={() => openModal("templateVars")}
            type="button"
          >
            {t("template.button")}
          </button>
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

      {/* 主内容区 — OutlinePanel + Editor + AgentSidebar 三栏布局 */}
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
        <ErrorBoundary FallbackComponent={AgentSidebarErrorFallback}>
          <AgentSidebar />
        </ErrorBoundary>
      </main>

      {/* 状态栏 */}
      <StatusBar />

      {/* SettingsDrawer */}
      {settingsDrawerOpen ? (
        <SettingsDrawer initialSection={initialSection} />
      ) : null}

      {/* CommandPalette */}
      {activeModal === "commandPalette" ? <CommandPalette /> : null}

      {/* PageSetupDialog */}
      {activeModal === "pageSetup" ? (
        <PageSetupDialog
          onClose={closeModal}
          open={activeModal === "pageSetup"}
        />
      ) : null}

      {/* HeaderFooterEditor */}
      {activeModal === "headerFooter" ? (
        <HeaderFooterEditor
          onClose={closeModal}
          open={activeModal === "headerFooter"}
        />
      ) : null}

      {/* VariableForm */}
      <VariableForm
        onOpenChange={(open) => !open && closeModal()}
        open={activeModal === "templateVars"}
      />

      {/* FindReplaceDialog */}
      {activeModal === "findReplace" ? <FindReplaceDialog /> : null}
    </div>
  );
}
