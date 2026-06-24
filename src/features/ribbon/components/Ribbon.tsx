// src/features/ribbon/components/Ribbon.tsx — Ribbon 容器(tabs bar + panel,响应式折叠)/ Ribbon container
// Phase 7.2: 标签页懒加载(React.lazy + Suspense)减少首屏 bundle
// Phase 7.3: 每个标签页用 RibbonErrorBoundary 包裹，隔离崩溃
// Phase 7.4: roving tabindex + 方向键切换时焦点跟随 + Home/End 跳转首末
// Phase 7.5: forced-colors 适配（按钮在系统高对比度下可见边框）
// Phase 7.6: tab 按钮加 id 供 aria-labelledby 关联
// Phase 4: 上下文标签页(选中表格/图片时出现)/ Contextual tabs for table/image selection
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/features/ribbon/hooks/use-media-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  type ContextualTab,
  type RibbonTab,
  useAppStore,
} from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { RIBBON_TABS } from "../ribbon-config";
import { RibbonErrorBoundary } from "./RibbonErrorBoundary";

/** Ribbon 回调(扩展 MenuBarCallbacks + onNewComment + onInsertPageBreak)*/
export type RibbonCallbacks = {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleOutline: () => void;
  onToggleAgentSidebar: () => void;
  onPageSetup: () => void;
  onHeaderFooter: () => void;
  onNewComment: () => void;
  onInsertPageBreak: () => void;
};

// Phase 7.2: 懒加载标签页组件，只有激活时加载
// 命名导出 → React.lazy 需要 default，用 .then 适配
const LazyHomeTab = lazy(() =>
  import("./tabs/HomeTab").then((m) => ({ default: m.HomeTab }))
);
const LazyInsertTab = lazy(() =>
  import("./tabs/InsertTab").then((m) => ({ default: m.InsertTab }))
);
const LazyLayoutTab = lazy(() =>
  import("./tabs/LayoutTab").then((m) => ({ default: m.LayoutTab }))
);
const LazyReferencesTab = lazy(() =>
  import("./tabs/ReferencesTab").then((m) => ({ default: m.ReferencesTab }))
);
const LazyReviewTab = lazy(() =>
  import("./tabs/ReviewTab").then((m) => ({ default: m.ReviewTab }))
);
const LazyViewTab = lazy(() =>
  import("./tabs/ViewTab").then((m) => ({ default: m.ViewTab }))
);
// Phase 4: 上下文标签页懒加载 / Contextual tabs lazy-loaded
const LazyTableToolsTab = lazy(() =>
  import("./tabs/TableToolsTab").then((m) => ({ default: m.TableToolsTab }))
);
const LazyPictureFormatTab = lazy(() =>
  import("./tabs/PictureFormatTab").then((m) => ({
    default: m.PictureFormatTab,
  }))
);

const TAB_COMPONENTS: Record<
  RibbonTab,
  React.ComponentType<RibbonCallbacks>
> = {
  home: LazyHomeTab,
  insert: LazyInsertTab,
  layout: LazyLayoutTab,
  references: LazyReferencesTab,
  review: LazyReviewTab,
  view: LazyViewTab,
};

// Phase 4: 上下文标签页组件映射 / Contextual tab component map
const CONTEXTUAL_TAB_COMPONENTS: Record<
  ContextualTab,
  React.ComponentType<RibbonCallbacks>
> = {
  tableTools: LazyTableToolsTab,
  pictureFormat: LazyPictureFormatTab,
};

// Phase 4: 上下文标签页配置(标签文案 + 触发条件)/ Contextual tab config
const CONTEXTUAL_TABS: {
  id: ContextualTab;
  labelKey: string;
  contextType: "table" | "image";
}[] = [
  { id: "tableTools", labelKey: "ribbon.tab.tableTools", contextType: "table" },
  {
    id: "pictureFormat",
    labelKey: "ribbon.tab.pictureFormat",
    contextType: "image",
  },
];

/** 响应式折叠断点:<768px 时隐藏面板,点击标签弹出浮层 / Responsive breakpoint */
const MOBILE_BREAKPOINT = "(min-width: 768px)";

/** 标签页加载中的 Suspense fallback */
function TabLoading() {
  const { t } = useT();
  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
      {t("ribbon.tab.loading")}
    </div>
  );
}

/**
 * Phase 4: 从 ProseMirror 选区推断上下文类型。
 * 向上遍历祖先节点:命中 table → 'table';命中 image → 'image'。
 * 返回 null 表示无法推断(无编辑器桥接),此时不覆盖既有上下文。
 * / Infer selection context type from the ProseMirror selection.
 * Returns null when no editor view is available (do not override).
 */
function inferSelectionContext(): "none" | "table" | "image" | null {
  const bridge = useDocumentStore.getState().editorBridge;
  const view = bridge?.getEditorView();
  if (!view) {
    return null;
  }
  const { $from } = view.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (!node) {
      continue;
    }
    if (node.type.name === "table") {
      return "table";
    }
    if (node.type.name === "image") {
      return "image";
    }
  }
  return "none";
}

export function Ribbon(callbacks: RibbonCallbacks) {
  const { t } = useT();
  const activeTab = useAppStore((s) => s.activeRibbonTab);
  const setActiveTab = useAppStore((s) => s.setActiveRibbonTab);
  // Phase 4: 选区上下文 + 当前激活的上下文标签页
  const selectionContext = useAppStore((s) => s.selectionContext);
  const activeContextualTab = useAppStore((s) => s.activeContextualTab);
  const setSelectionContext = useAppStore((s) => s.setSelectionContext);
  const setActiveContextualTab = useAppStore((s) => s.setActiveContextualTab);
  // Phase 7.4: 标签按钮引用，方向键切换后移动焦点
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Phase 4: 订阅选区变化,检测表格/图片上下文并同步到 store。
  // 仅当能从编辑器桥接读到 ProseMirror view 时才更新(infer 返回 null 时跳过,
  // 避免覆盖由外部设置的上下文,如测试或 useEditorBridge 直接写入)。
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectionInfo is the change signal that triggers re-detection
  useEffect(() => {
    const nextType = inferSelectionContext();
    if (nextType === null) {
      return;
    }
    if (nextType !== selectionContext.type) {
      setSelectionContext({ type: nextType });
    }
  }, [selectionInfo, selectionContext.type, setSelectionContext]);

  // Phase 4: 当上下文标签页存在时,自动激活它(选区进入表格/图片)
  useEffect(() => {
    if (selectionContext.type === "table") {
      setActiveContextualTab("tableTools");
    } else if (selectionContext.type === "image") {
      setActiveContextualTab("pictureFormat");
    }
    // 上下文消失时由 setSelectionContext 清除 activeContextualTab
  }, [selectionContext.type, setActiveContextualTab]);

  // Phase 4: 当前应显示的上下文标签页(基于选区上下文)
  const visibleContextualTabs = CONTEXTUAL_TABS.filter(
    (ct) => ct.contextType === selectionContext.type
  );

  // Phase 4: 当前激活的标签页 id(固定或上下文)/ Active tab id (fixed or contextual)
  const activeTabId = activeContextualTab ?? activeTab;
  const isContextualActive = activeContextualTab !== null;

  const focusTab = (tabId: string) => {
    // React 状态更新后下一帧聚焦
    requestAnimationFrame(() => {
      tabBtnRefs.current[tabId]?.focus();
    });
  };

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    // Phase 4: 合并固定 + 上下文标签页进行方向键导航
    const allTabs: string[] = [
      ...RIBBON_TABS.map((tab) => tab.id),
      ...visibleContextualTabs.map((ct) => ct.id),
    ];
    const currentId = activeContextualTab ?? activeTab;
    const idx = allTabs.indexOf(currentId);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % allTabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + allTabs.length) % allTabs.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = allTabs.length - 1;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      const nextId = allTabs[nextIdx];
      handleTabClick(nextId);
      focusTab(nextId);
    }
  };

  const isDesktop = useMediaQuery(MOBILE_BREAKPOINT);
  // 窄屏浮层打开状态 / Mobile popover open state
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Phase 4: 当前激活的面板组件(固定或上下文)/ Active panel component
  const ActivePanel = isContextualActive
    ? CONTEXTUAL_TAB_COMPONENTS[activeContextualTab]
    : TAB_COMPONENTS[activeTab];

  // 切换标签时:宽屏直接显示,窄屏关闭浮层(需再点才展开)
  useEffect(() => {
    if (isDesktop) {
      setMobilePanelOpen(false);
    }
  }, [isDesktop]);

  // 浮层 Escape 关闭
  useEffect(() => {
    if (isDesktop || !mobilePanelOpen) {
      return;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobilePanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isDesktop, mobilePanelOpen]);

  // Phase 4: 统一处理固定/上下文标签页点击
  const handleTabClick = (tabId: string) => {
    const isContextual = (["tableTools", "pictureFormat"] as string[]).includes(
      tabId
    );
    if (isContextual) {
      setActiveContextualTab(tabId as ContextualTab);
    } else {
      // 点击固定标签页时退出上下文标签页
      setActiveContextualTab(null);
      setActiveTab(tabId as RibbonTab);
    }
    // 窄屏:点击标签弹出浮层面板
    if (!isDesktop) {
      setMobilePanelOpen(true);
    }
  };

  // 浮层背板点击关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMobilePanelOpen(false);
    }
  };

  const panelContent = (
    <RibbonErrorBoundary tabId={activeTabId}>
      <Suspense fallback={<TabLoading />}>
        <ActivePanel {...callbacks} />
      </Suspense>
    </RibbonErrorBoundary>
  );

  // 面板渲染:宽屏内联,窄屏浮层 / Panel render: inline on desktop, popover on mobile
  const renderPanel = () => {
    if (isDesktop) {
      return (
        <div
          aria-labelledby={`ribbon-tab-${activeTabId}`}
          className="flex h-[88px] items-stretch gap-1 overflow-x-auto px-2 py-1"
          role="tabpanel"
        >
          {panelContent}
        </div>
      );
    }
    if (!mobilePanelOpen) {
      return null;
    }
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close is standard UX
      // biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click-to-close is standard UX
      // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled by separate keydown listener
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16"
        onClick={handleBackdropClick}
      >
        <div
          aria-modal="true"
          className="max-h-[60vh] w-full max-w-[640px] overflow-y-auto rounded-lg bg-background p-2 shadow-xl"
          role="dialog"
        >
          <div
            aria-labelledby={`ribbon-tab-${activeTabId}`}
            className="flex items-stretch gap-1 py-1"
            role="tabpanel"
          >
            {panelContent}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex shrink-0 flex-col border-border border-b bg-background">
      {/* 标签页栏 / Tab bar */}
      <div
        className="flex items-center gap-0.5 border-border border-b px-2"
        onKeyDown={onTabKeyDown}
        role="tablist"
      >
        {RIBBON_TABS.map((tab) => (
          <button
            aria-selected={!isContextualActive && activeTab === tab.id}
            className={cn(
              "relative rounded-t px-3 py-1.5 text-xs transition-colors",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
              // Phase 7.5: 高对比度模式下显示边框确保可见
              "forced-colors:border forced-colors:border-[ButtonBorder]",
              !isContextualActive && activeTab === tab.id
                ? "bg-background font-medium text-foreground after:opacity-100"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            data-active={!isContextualActive && activeTab === tab.id}
            id={`ribbon-tab-${tab.id}`}
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            ref={(el) => {
              tabBtnRefs.current[tab.id] = el;
            }}
            role="tab"
            tabIndex={!isContextualActive && activeTab === tab.id ? 0 : -1}
            type="button"
          >
            {t(tab.labelKey)}
          </button>
        ))}
        {/* Phase 4: 上下文标签页(高亮色区分)/ Contextual tabs with highlight */}
        {visibleContextualTabs.map((ct) => {
          const isActive = activeContextualTab === ct.id;
          return (
            <button
              aria-selected={isActive}
              className={cn(
                "relative rounded-t px-3 py-1.5 text-xs transition-colors",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:opacity-0 after:transition-opacity",
                "forced-colors:border forced-colors:border-[ButtonBorder]",
                // 上下文标签页用高亮色区分 / Highlight color for contextual tabs
                "bg-primary/10 font-medium text-primary",
                isActive
                  ? "after:bg-primary after:opacity-100"
                  : "hover:bg-primary/20"
              )}
              data-active={isActive}
              data-contextual="true"
              id={`ribbon-tab-${ct.id}`}
              key={ct.id}
              onClick={() => handleTabClick(ct.id)}
              ref={(el) => {
                tabBtnRefs.current[ct.id] = el;
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {t(ct.labelKey)}
            </button>
          );
        })}
      </div>

      {/* 面板区域 / Panel area */}
      {renderPanel()}
    </div>
  );
}
