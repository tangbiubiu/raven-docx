// src/features/ribbon/components/Ribbon.tsx — Ribbon 容器(tabs bar + panel,响应式折叠)/ Ribbon container
// Phase 7.2: 标签页懒加载(React.lazy + Suspense)减少首屏 bundle
// Phase 7.3: 每个标签页用 RibbonErrorBoundary 包裹，隔离崩溃
// Phase 7.4: roving tabindex + 方向键切换时焦点跟随 + Home/End 跳转首末
// Phase 7.5: forced-colors 适配（按钮在系统高对比度下可见边框）
// Phase 7.6: tab 按钮加 id 供 aria-labelledby 关联
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/features/ribbon/hooks/use-media-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type RibbonTab, useAppStore } from "@/stores/useAppStore";
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
export function Ribbon(callbacks: RibbonCallbacks) {
  const { t } = useT();
  const activeTab = useAppStore((s) => s.activeRibbonTab);
  const setActiveTab = useAppStore((s) => s.setActiveRibbonTab);
  // Phase 7.4: 标签按钮引用，方向键切换后移动焦点
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (tabId: RibbonTab) => {
    // React 状态更新后下一帧聚焦
    requestAnimationFrame(() => {
      tabBtnRefs.current[tabId]?.focus();
    });
  };

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const idx = RIBBON_TABS.findIndex((tab) => tab.id === activeTab);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % RIBBON_TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + RIBBON_TABS.length) % RIBBON_TABS.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = RIBBON_TABS.length - 1;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      const nextTab = RIBBON_TABS[nextIdx].id;
      handleTabClick(nextTab);
      focusTab(nextTab);
    }
  };

  const isDesktop = useMediaQuery(MOBILE_BREAKPOINT);
  // 窄屏浮层打开状态 / Mobile popover open state
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const ActivePanel = TAB_COMPONENTS[activeTab];

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

  const handleTabClick = (tabId: RibbonTab) => {
    setActiveTab(tabId);
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
    <RibbonErrorBoundary tabId={activeTab}>
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
          aria-labelledby={`ribbon-tab-${activeTab}`}
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
            aria-labelledby={`ribbon-tab-${activeTab}`}
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
            aria-selected={activeTab === tab.id}
            className={cn(
              "relative rounded-t px-3 py-1.5 text-xs transition-colors",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
              // Phase 7.5: 高对比度模式下显示边框确保可见
              "forced-colors:border forced-colors:border-[ButtonBorder]",
              activeTab === tab.id
                ? "bg-background font-medium text-foreground after:opacity-100"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            data-active={activeTab === tab.id}
            id={`ribbon-tab-${tab.id}`}
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            ref={(el) => {
              tabBtnRefs.current[tab.id] = el;
            }}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* 面板区域 / Panel area */}
      {renderPanel()}
    </div>
  );
}
