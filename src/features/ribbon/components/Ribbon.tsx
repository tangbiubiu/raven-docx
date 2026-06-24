// src/features/ribbon/components/Ribbon.tsx — Ribbon 容器(tabs bar + panel,响应式折叠)/ Ribbon container
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/features/ribbon/hooks/use-media-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type RibbonTab, useAppStore } from "@/stores/useAppStore";
import { RIBBON_TABS } from "../ribbon-config";
import { HomeTab } from "./tabs/HomeTab";
import { InsertTab } from "./tabs/InsertTab";
import { LayoutTab } from "./tabs/LayoutTab";
import { ReferencesTab } from "./tabs/ReferencesTab";
import { ReviewTab } from "./tabs/ReviewTab";
import { ViewTab } from "./tabs/ViewTab";

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

const TAB_COMPONENTS: Record<
  RibbonTab,
  (props: RibbonCallbacks) => React.ReactElement
> = {
  home: HomeTab,
  insert: InsertTab,
  layout: LayoutTab,
  references: ReferencesTab,
  review: ReviewTab,
  view: ViewTab,
};

/** 响应式折叠断点:<768px 时隐藏面板,点击标签弹出浮层 / Responsive breakpoint */
const MOBILE_BREAKPOINT = "(min-width: 768px)";

export function Ribbon(callbacks: RibbonCallbacks) {
  const { t } = useT();
  const activeTab = useAppStore((s) => s.activeRibbonTab);
  const setActiveTab = useAppStore((s) => s.setActiveRibbonTab);

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

  const panelContent = <ActivePanel {...callbacks} />;

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
        onKeyDown={(e) => {
          const idx = RIBBON_TABS.findIndex((tab) => tab.id === activeTab);
          if (e.key === "ArrowRight") {
            handleTabClick(RIBBON_TABS[(idx + 1) % RIBBON_TABS.length].id);
          } else if (e.key === "ArrowLeft") {
            handleTabClick(
              RIBBON_TABS[(idx - 1 + RIBBON_TABS.length) % RIBBON_TABS.length]
                .id
            );
          }
        }}
        role="tablist"
      >
        {RIBBON_TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={cn(
              "relative rounded-t px-3 py-1.5 text-xs transition-colors",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
              activeTab === tab.id
                ? "bg-background font-medium text-foreground after:opacity-100"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            data-active={activeTab === tab.id}
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            role="tab"
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
