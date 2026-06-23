// pages/WorkspacePage.tsx — 编辑器主页面 (Workspace Page)
// 单页面应用的唯一页面，编排所有面板和弹层
// Reference: .dev/docs/modules/pages/workspace-page.md

import { useEffect, useRef } from "react";
import { AgentSidebar } from "@/features/agent/components/agent-sidebar";
import { CommandPalette } from "@/features/agent/components/command-palette";
import { DocumentTitleBar } from "@/features/document/components/document-title-bar";
import { UnsavedConfirmDialog } from "@/features/document/components/unsaved-confirm-dialog";
import { useAutoSave } from "@/features/document/hooks/use-auto-save";
import { useCloseGuard } from "@/features/document/hooks/use-close-guard";
import { useDocument } from "@/features/document/hooks/useDocument";
import { EditorPane } from "@/features/editor/components/EditorPane";
import { OutlinePanel } from "@/features/editor/components/OutlinePanel";
import { Ruler } from "@/features/editor/components/Ruler";
import { StatusBar } from "@/features/editor/components/StatusBar";
import { FindReplaceDialog } from "@/features/find-replace/components/find-replace-dialog";
import { PanelPopover } from "@/features/layout/components/PanelPopover";
import { PanelResizeHandle } from "@/features/layout/components/PanelResizeHandle";
import type { MenuBarCallbacks } from "@/features/menubar/components/menu-bar";
import { MenuBar } from "@/features/menubar/components/menu-bar";
import { HeaderFooterEditor } from "@/features/page-layout/components/HeaderFooterEditor";
import { PageSetupDialog } from "@/features/page-layout/components/PageSetupDialog";
import { Ribbon } from "@/features/ribbon";
import type { RibbonCallbacks } from "@/features/ribbon/components/Ribbon";
import { SettingsDrawer } from "@/features/settings/components/SettingsDrawer";
import { VariableForm } from "@/features/template/components/variable-form";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { commands } from "@/lib/bindings";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

/**
 * WorkspacePage — 编辑器主页面。
 *
 * 布局层次：
 *  DocumentTitleBar → MenuBar → Ribbon → Main(Outline|Float | Ruler+Editor | Agent|Float) → StatusBar
 */
export default function WorkspacePage() {
  const { t } = useT();
  const settingsDrawerOpen = useAppStore((s) => s.settingsDrawerOpen);
  const toggleSettingsDrawer = useAppStore((s) => s.toggleSettingsDrawer);
  const setSettingsDrawerOpen = useAppStore((s) => s.setSettingsDrawerOpen);
  const toggleOutlinePanel = useAppStore((s) => s.toggleOutlinePanel);
  const toggleAgentSidebar = useAppStore((s) => s.toggleAgentSidebar);
  const activeModal = useAppStore((s) => s.activeModal);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const outlinePanelCollapsed = useAppStore((s) => s.outlinePanelCollapsed);
  const agentSidebarOpen = useAppStore((s) => s.agentSidebarOpen);
  const outlineWidth = useAppStore((s) => s.outlineWidth);
  const setOutlineWidth = useAppStore((s) => s.setOutlineWidth);
  const agentWidth = useAppStore((s) => s.agentWidth);
  const setAgentWidth = useAppStore((s) => s.setAgentWidth);
  const outlineFloatOpen = useAppStore((s) => s.outlineFloatOpen);
  const setOutlineFloatOpen = useAppStore((s) => s.setOutlineFloatOpen);
  const agentFloatOpen = useAppStore((s) => s.agentFloatOpen);
  const setAgentFloatOpen = useAppStore((s) => s.setAgentFloatOpen);

  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const hasApiKey = useSettingsStore((s) => !!s.apiConfig.apiKey);

  const documentBuffer = useDocumentStore((s) => s.documentBuffer);
  const isNewDocument = useDocumentStore((s) => s.isNewDocument);
  const documentPath = useDocumentStore((s) => s.documentPath);
  const zoom = useDocumentStore((s) => s.zoom);
  const setZoom = useDocumentStore((s) => s.setZoom);

  const { newDocument, openDocument, saveDocument } = useDocument();
  useAutoSave();
  const closeGuard = useCloseGuard({ saveDocument });

  // 文档切换时关闭 pi 进程（丢弃旧对话历史，状态干净）
  const prevDocPathRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (
      prevDocPathRef.current !== undefined &&
      prevDocPathRef.current !== documentPath
    ) {
      commands.agentShutdown().catch(() => {
        // 忽略关闭错误（进程可能已停止）
      });
    }
    prevDocPathRef.current = documentPath;
  }, [documentPath]);
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
      if (e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        openModal("findReplace");
      } else if (e.key === "h" && !e.shiftKey) {
        e.preventDefault();
        openModal("findReplace");
      }
    };

    const handlePrint = (e: KeyboardEvent) => {
      if (e.key === "p" && !e.shiftKey) {
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
    onPageSetup: () => openModal("pageSetup"),
    onHeaderFooter: () => openModal("headerFooter"),
    onToggleAgentSidebar: toggleAgentSidebar,
  };

  // Ribbon 回调(扩展 menuCallbacks + 批注/分页符)
  const ribbonCallbacks: RibbonCallbacks = {
    ...menuCallbacks,
    onNewComment: () => {
      useAppStore.getState().setAgentSidebarOpen(true);
      useAppStore.getState().setCommentPanelOpen(true);
    },
    onInsertPageBreak: () => {
      const bridge = useDocumentStore.getState().editorBridge;
      bridge?.applyFormatting?.({ insertPageBreak: true });
    },
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

      {/* Ribbon 功能区(替代旧 Toolbar)/ Ribbon (replaces Toolbar) */}
      <Ribbon {...ribbonCallbacks} />

      {/* 主内容区 — 可调宽三栏 + 折叠浮窗 / Resizable three-column + collapse popover */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* 左栏:大纲(展开态可调宽 / 折叠态竖条 + 浮窗)*/}
        {outlinePanelCollapsed ? (
          <>
            <button
              aria-label={t("panel.expand.outline")}
              className="flex h-full w-[22px] shrink-0 items-center justify-center border-border border-r bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setOutlineFloatOpen(true)}
              title={t("panel.expand.outline")}
              type="button"
            >
              <span
                className="text-[11px]"
                style={{ writingMode: "vertical-rl" }}
              >
                {t("editor.outline.title")}
              </span>
            </button>
            {/* 折叠态浮窗 / Collapse popover */}
            <PanelPopover
              onClose={() => setOutlineFloatOpen(false)}
              open={outlineFloatOpen}
              side="left"
              width={outlineWidth}
            >
              <OutlinePanel />
            </PanelPopover>
          </>
        ) : (
          <>
            <div className="shrink-0" style={{ width: outlineWidth }}>
              <OutlinePanel />
            </div>
            <PanelResizeHandle
              currentWidth={outlineWidth}
              labelKey="panel.resize.outline"
              onResize={setOutlineWidth}
              side="left"
            />
          </>
        )}

        {/* 中栏:标尺 + 编辑器 / Ruler + Editor */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <Ruler />
          <EditorPane
            documentBuffer={documentBuffer}
            isNewDocument={isNewDocument}
          />
        </div>

        {/* 右栏:Agent(展开态可调宽 / 折叠态竖条 + 浮窗)*/}
        {agentSidebarOpen ? (
          <>
            <PanelResizeHandle
              currentWidth={agentWidth}
              labelKey="panel.resize.agent"
              onResize={setAgentWidth}
              side="right"
            />
            <div className="shrink-0" style={{ width: agentWidth }}>
              <AgentSidebar />
            </div>
          </>
        ) : (
          <>
            <button
              aria-label={t("panel.expand.agent")}
              className="flex h-full w-8 shrink-0 items-center justify-center border-border border-l bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setAgentFloatOpen(true)}
              title={t("panel.expand.agent")}
              type="button"
            >
              <span
                className="text-[11px]"
                style={{ writingMode: "vertical-rl" }}
              >
                {t("agent.title")}
              </span>
            </button>
            {/* 折叠态浮窗 / Collapse popover */}
            <PanelPopover
              onClose={() => setAgentFloatOpen(false)}
              open={agentFloatOpen}
              side="right"
              width={agentWidth}
            >
              <AgentSidebar />
            </PanelPopover>
          </>
        )}
      </main>
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
      {/* 窗口关闭未保存确认 */}
      <UnsavedConfirmDialog
        onCancel={closeGuard.handleCancel}
        onDiscard={closeGuard.handleDiscard}
        onSave={closeGuard.handleSave}
        open={closeGuard.confirmOpen}
      />
    </div>
  );
}
