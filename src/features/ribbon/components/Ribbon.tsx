// src/features/ribbon/components/Ribbon.tsx — Ribbon 容器(tabs bar + panel)/ Ribbon container
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

export function Ribbon(callbacks: RibbonCallbacks) {
  const { t } = useT();
  const activeTab = useAppStore((s) => s.activeRibbonTab);
  const setActiveTab = useAppStore((s) => s.setActiveRibbonTab);

  const ActivePanel = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex shrink-0 flex-col border-border border-b bg-background">
      {/* 标签页栏 / Tab bar */}
      <div
        className="flex items-center gap-0.5 border-border border-b px-2"
        onKeyDown={(e) => {
          const idx = RIBBON_TABS.findIndex((tab) => tab.id === activeTab);
          if (e.key === "ArrowRight") {
            setActiveTab(RIBBON_TABS[(idx + 1) % RIBBON_TABS.length].id);
          } else if (e.key === "ArrowLeft") {
            setActiveTab(
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
              "rounded-t px-3 py-1.5 text-xs transition-colors",
              activeTab === tab.id
                ? "bg-background font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            data-active={activeTab === tab.id}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* 面板区域 / Panel area */}
      <div
        aria-labelledby={`ribbon-tab-${activeTab}`}
        className="flex h-[88px] items-stretch gap-1 overflow-x-auto px-2 py-1"
        role="tabpanel"
      >
        <ActivePanel {...callbacks} />
      </div>
    </div>
  );
}
