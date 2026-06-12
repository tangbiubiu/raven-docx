// useAppStore — 应用级状态 (Application State)
// 管理浮层栈、侧边面板、加载状态
// Reference: .dev/docs/modules/stores.md §5

import { create } from "zustand";

/**
 * 全局浮层类型
 */
export type AppModal =
  | "commandPalette"
  | "findReplace"
  | "pageSetup"
  | "hyperlink"
  | "insertTable"
  | null;

/**
 * 应用级状态
 */
export type AppState = {
  /** 浮层栈（全局 Portal） */
  activeModal: AppModal;

  /** 侧边面板 */
  settingsDrawerOpen: boolean;
  agentSidebarOpen: boolean; // 需持久化
  outlinePanelCollapsed: boolean; // 需持久化

  /** 应用初始加载 */
  isInitialLoading: boolean;

  // --- Actions ---
  openModal(id: AppModal): void;
  closeModal(): void;
  toggleSettingsDrawer(): void;
  setSettingsDrawerOpen(open: boolean): void;
  toggleAgentSidebar(): void;
  setAgentSidebarOpen(open: boolean): void;
  toggleOutlinePanel(): void;
  setOutlinePanelCollapsed(collapsed: boolean): void;
  setInitialLoading(loading: boolean): void;
};

const initialAppState = {
  activeModal: null as AppModal,
  settingsDrawerOpen: false,
  agentSidebarOpen: true,
  outlinePanelCollapsed: false,
  isInitialLoading: true,
} as const satisfies Partial<AppState>;

export const useAppStore = create<AppState>((set) => ({
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

  setInitialLoading(loading) {
    set({ isInitialLoading: loading });
  },
}));
