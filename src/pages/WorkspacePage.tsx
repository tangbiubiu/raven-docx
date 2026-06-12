// WorkspacePage — 编辑器主页面 (Workspace Page)
// 单页面应用的核心布局编排器，组合所有面板组件
// Phase 1: 布局壳，所有子组件为占位状态
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §2, .dev/docs/modules/pages/workspace-page.md

import { useEffect } from "react";
import { DocumentTitleBar } from "@/features/document/components/DocumentTitleBar";
import { MenuBar } from "@/features/formatting/components/MenuBar";
import { Toolbar } from "@/features/formatting/components/Toolbar";
import { EditorPane } from "@/features/editor/components/EditorPane";
import { StatusBar } from "@/features/editor/components/StatusBar";
import { OutlinePanel } from "@/features/editor/components/OutlinePanel";
import { AgentSidebar } from "@/features/agent/components/AgentSidebar";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAppStore } from "@/stores/useAppStore";
import { onCloseRequested } from "@/lib/tauri-events";
import { useKeyboard } from "@/hooks/useKeyboard";
import { logger } from "@/lib/logger";

export function WorkspacePage() {
  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const setInitialLoading = useAppStore((s) => s.setInitialLoading);

  // 设置加载完成后降下 loading 状态
  useEffect(() => {
    if (isLoaded) {
      setInitialLoading(false);
    }
  }, [isLoaded, setInitialLoading]);

  // 注册 Tauri 关闭事件
  useEffect(() => {
    const unlistenPromise = onCloseRequested(async () => {
      logger.debug("Close requested, checking unsaved changes");
      // Phase 1: 暂不实现关闭提示，直接允许关闭
    });

    return () => {
      unlistenPromise
        .then((unlisten) => unlisten())
        .catch(() => {
          // cleanup may fail in test environment
        });
    };
  }, []);

  // 注册全局快捷键
  useKeyboard([
    {
      key: "k",
      metaKey: true,
      handler: () => {
        // Phase 3: 打开 CommandPalette
        logger.debug("Cmd+K pressed");
      },
    },
    {
      key: "f",
      metaKey: true,
      handler: () => {
        // Phase 2: 打开 FindReplaceDialog
        logger.debug("Cmd+F pressed");
      },
    },
    {
      key: "s",
      metaKey: true,
      handler: () => {
        // Phase 2: 保存文档
        logger.debug("Cmd+S pressed");
      },
    },
    {
      key: "Escape",
      handler: () => {
        // 关闭当前弹窗
        useAppStore.getState().closeModal();
      },
    },
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* 标题栏区域 */}
      <DocumentTitleBar />

      {/* 菜单栏 */}
      <MenuBar />

      {/* 格式工具栏 */}
      <Toolbar />

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧大纲面板 */}
        <OutlinePanel />

        {/* 编辑器区域 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorPane />
        </div>

        {/* 右侧 Agent 侧边栏 */}
        <AgentSidebar />
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  );
}