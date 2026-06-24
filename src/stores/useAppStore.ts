// useAppStore — 应用级状态 (Application State)
// 管理浮层栈、侧边面板、加载状态
// Reference: .dev/docs/modules/stores.md §5

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * 全局浮层类型
 */
export type AppModal =
  | "commandPalette"
  | "findReplace"
  | "pageSetup"
  | "headerFooter"
  | "hyperlink"
  | "insertTable"
  | "insertImage"
  | "footnote"
  | "templateVars"
  | null;

/** Ribbon 固定标签页 ID / Ribbon fixed tab id */
export type RibbonTab =
  | "home"
  | "insert"
  | "layout"
  | "references"
  | "review"
  | "view";

/** Ribbon 上下文标签页 ID(选中表格/图片时出现)/ Ribbon contextual tab id */
export type ContextualTab = "tableTools" | "pictureFormat";

/** 选区上下文类型 / Selection context type */
export type SelectionContextType = "none" | "table" | "image";

/** 选区上下文(驱动上下文标签页显示)/ Selection context */
export type SelectionContext = {
  type: SelectionContextType;
};

/** 面板宽度范围常量 / Panel width range constants */
export const OUTLINE_WIDTH_MIN = 160;
export const OUTLINE_WIDTH_MAX = 400;
export const AGENT_WIDTH_MIN = 280;
export const AGENT_WIDTH_MAX = 560;
/** 面板默认宽度(双击手柄恢复)/ Panel default widths (double-click reset) */
export const DEFAULT_OUTLINE_WIDTH = 220;
export const DEFAULT_AGENT_WIDTH = 380;
/**
 * 应用级状态
 */
export type AppState = {
  activeModal: AppModal;

  /** Ribbon 当前激活标签页 / Currently active ribbon tab */
  activeRibbonTab: RibbonTab;
  /** 左栏（大纲）宽度(px) / Outline panel width */
  outlineWidth: number;
  /** 右栏（Agent）宽度(px) / Agent panel width */
  agentWidth: number;
  /** 左栏弹出浮窗是否打开（折叠态下点击竖条触发）/ Outline float open */
  outlineFloatOpen: boolean;
  /** 右栏弹出浮窗是否打开 / Agent float open */
  agentFloatOpen: boolean;

  /** 侧边面板 */
  settingsDrawerOpen: boolean;
  agentSidebarOpen: boolean; // 需持久化
  outlinePanelCollapsed: boolean; // 需持久化
  commentPanelOpen: boolean; // 批注面板状态

  /** 应用初始加载 */
  isInitialLoading: boolean;

  /** 选区上下文(不持久化,驱动上下文标签页显示)/ Selection context */
  selectionContext: SelectionContext;
  /** 当前激活的上下文标签页(不持久化;为 null 时显示固定标签页)/ Active contextual tab */
  activeContextualTab: ContextualTab | null;

  /** 标尺可见性(运行时偏好,不持久化)/ Ruler visibility (runtime, not persisted) */
  rulerVisible: boolean;

  // --- Actions ---
  openModal(id: AppModal): void;
  closeModal(): void;
  toggleSettingsDrawer(): void;
  setSettingsDrawerOpen(open: boolean): void;
  toggleAgentSidebar(): void;
  setAgentSidebarOpen(open: boolean): void;
  toggleOutlinePanel(): void;
  setOutlinePanelCollapsed(collapsed: boolean): void;
  toggleCommentPanel(): void;
  setCommentPanelOpen(open: boolean): void;
  setInitialLoading(loading: boolean): void;
  setActiveRibbonTab(tab: RibbonTab): void;
  setOutlineWidth(width: number): void;
  setAgentWidth(width: number): void;
  setOutlineFloatOpen(open: boolean): void;
  setAgentFloatOpen(open: boolean): void;
  /** 设置选区上下文 / Set selection context */
  setSelectionContext(ctx: SelectionContext): void;
  /** 设置当前激活的上下文标签页(null = 回到固定标签页)/ Set active contextual tab */
  setActiveContextualTab(tab: ContextualTab | null): void;
  /** 切换标尺可见性 / Toggle ruler visibility */
  toggleRuler(): void;
};

const initialAppState = {
  activeModal: null as AppModal,
  activeRibbonTab: "home" as RibbonTab,
  outlineWidth: DEFAULT_OUTLINE_WIDTH,
  agentWidth: DEFAULT_AGENT_WIDTH,
  outlineFloatOpen: false,
  agentFloatOpen: false,
  settingsDrawerOpen: false,
  agentSidebarOpen: true,
  outlinePanelCollapsed: false,
  commentPanelOpen: false,
  isInitialLoading: true,
  selectionContext: { type: "none" } as SelectionContext,
  activeContextualTab: null as ContextualTab | null,
  rulerVisible: false,
} as const satisfies Partial<AppState>;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialAppState,

      openModal(id) {
        set({ activeModal: id });
      },

      closeModal() {
        set({ activeModal: null });
      },

      toggleSettingsDrawer() {
        set((state) => ({ settingsDrawerOpen: !state.settingsDrawerOpen }));
      },

      setSettingsDrawerOpen(open) {
        set({ settingsDrawerOpen: open });
      },

      toggleAgentSidebar() {
        set((state) => ({ agentSidebarOpen: !state.agentSidebarOpen }));
      },

      setAgentSidebarOpen(open) {
        set({ agentSidebarOpen: open });
      },

      toggleOutlinePanel() {
        set((state) => ({
          outlinePanelCollapsed: !state.outlinePanelCollapsed,
        }));
      },

      setOutlinePanelCollapsed(collapsed) {
        set({ outlinePanelCollapsed: collapsed });
      },

      toggleCommentPanel() {
        set((state) => ({ commentPanelOpen: !state.commentPanelOpen }));
      },

      setCommentPanelOpen(open) {
        set({ commentPanelOpen: open });
      },

      setInitialLoading(loading) {
        set({ isInitialLoading: loading });
      },

      setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),
      setOutlineWidth: (width) =>
        set({
          outlineWidth: Math.min(
            Math.max(width, OUTLINE_WIDTH_MIN),
            OUTLINE_WIDTH_MAX
          ),
        }),
      setAgentWidth: (width) =>
        set({
          agentWidth: Math.min(
            Math.max(width, AGENT_WIDTH_MIN),
            AGENT_WIDTH_MAX
          ),
        }),
      setOutlineFloatOpen: (open) => set({ outlineFloatOpen: open }),
      setAgentFloatOpen: (open) => set({ agentFloatOpen: open }),
      setSelectionContext: (ctx) =>
        set(() => {
          // 上下文消失时,清除激活的上下文标签页(回到固定标签页)
          if (ctx.type === "none") {
            return { selectionContext: ctx, activeContextualTab: null };
          }
          return { selectionContext: ctx };
        }),
      setActiveContextualTab: (tab) => set({ activeContextualTab: tab }),
      toggleRuler: () => set((state) => ({ rulerVisible: !state.rulerVisible })),
    }),
    {
      name: "raven:app-layout",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        outlinePanelCollapsed: state.outlinePanelCollapsed,
        agentSidebarOpen: state.agentSidebarOpen,
        activeRibbonTab: state.activeRibbonTab,
        outlineWidth: state.outlineWidth,
        agentWidth: state.agentWidth,
      }),
    }
  )
);
