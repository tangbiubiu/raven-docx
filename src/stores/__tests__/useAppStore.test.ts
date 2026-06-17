// stores/__tests__/useAppStore.test.ts — 应用级状态 Store 单元测试
// Reference: .dev/docs/modules/stores.md §5

import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    // 重置到初始状态
    useAppStore.setState({
      activeModal: null,
      settingsDrawerOpen: false,
      agentSidebarOpen: true,
      outlinePanelCollapsed: false,
      commentPanelOpen: false,
      isInitialLoading: true,
    });
  });

  describe("初始状态", () => {
    it("activeModal 初始为 null", () => {
      expect(useAppStore.getState().activeModal).toBeNull();
    });

    it("settingsDrawerOpen 初始为 false", () => {
      expect(useAppStore.getState().settingsDrawerOpen).toBe(false);
    });

    it("agentSidebarOpen 初始为 true", () => {
      expect(useAppStore.getState().agentSidebarOpen).toBe(true);
    });

    it("outlinePanelCollapsed 初始为 false", () => {
      expect(useAppStore.getState().outlinePanelCollapsed).toBe(false);
    });

    it("commentPanelOpen 初始为 false", () => {
      expect(useAppStore.getState().commentPanelOpen).toBe(false);
    });

    it("isInitialLoading 初始为 true", () => {
      expect(useAppStore.getState().isInitialLoading).toBe(true);
    });
  });

  describe("浮层管理", () => {
    it("openModal 设置浮层", () => {
      useAppStore.getState().openModal("commandPalette");
      expect(useAppStore.getState().activeModal).toBe("commandPalette");
    });

    it("closeModal 清除浮层", () => {
      useAppStore.getState().openModal("findReplace");
      useAppStore.getState().closeModal();
      expect(useAppStore.getState().activeModal).toBeNull();
    });

    it("切换浮层：先打开 commandPalette，再打开 findReplace", () => {
      useAppStore.getState().openModal("commandPalette");
      useAppStore.getState().openModal("findReplace");
      expect(useAppStore.getState().activeModal).toBe("findReplace");
    });
  });

  describe("侧边面板", () => {
    it("toggleSettingsDrawer 切换开关", () => {
      expect(useAppStore.getState().settingsDrawerOpen).toBe(false);
      useAppStore.getState().toggleSettingsDrawer();
      expect(useAppStore.getState().settingsDrawerOpen).toBe(true);
      useAppStore.getState().toggleSettingsDrawer();
      expect(useAppStore.getState().settingsDrawerOpen).toBe(false);
    });

    it("setSettingsDrawerOpen 直接设置", () => {
      useAppStore.getState().setSettingsDrawerOpen(true);
      expect(useAppStore.getState().settingsDrawerOpen).toBe(true);
    });

    it("toggleAgentSidebar 切换开关", () => {
      useAppStore.getState().toggleAgentSidebar();
      expect(useAppStore.getState().agentSidebarOpen).toBe(false);
      useAppStore.getState().toggleAgentSidebar();
      expect(useAppStore.getState().agentSidebarOpen).toBe(true);
    });

    it("setAgentSidebarOpen 直接设置", () => {
      useAppStore.getState().setAgentSidebarOpen(false);
      expect(useAppStore.getState().agentSidebarOpen).toBe(false);
    });

    it("toggleOutlinePanel 切换折叠", () => {
      useAppStore.getState().toggleOutlinePanel();
      expect(useAppStore.getState().outlinePanelCollapsed).toBe(true);
      useAppStore.getState().toggleOutlinePanel();
      expect(useAppStore.getState().outlinePanelCollapsed).toBe(false);
    });

    it("setOutlinePanelCollapsed 直接设置", () => {
      useAppStore.getState().setOutlinePanelCollapsed(true);
      expect(useAppStore.getState().outlinePanelCollapsed).toBe(true);
    });

    it("toggleCommentPanel 切换开关", () => {
      expect(useAppStore.getState().commentPanelOpen).toBe(false);
      useAppStore.getState().toggleCommentPanel();
      expect(useAppStore.getState().commentPanelOpen).toBe(true);
      useAppStore.getState().toggleCommentPanel();
      expect(useAppStore.getState().commentPanelOpen).toBe(false);
    });

    it("setCommentPanelOpen 直接设置", () => {
      useAppStore.getState().setCommentPanelOpen(true);
      expect(useAppStore.getState().commentPanelOpen).toBe(true);
      useAppStore.getState().setCommentPanelOpen(false);
      expect(useAppStore.getState().commentPanelOpen).toBe(false);
    });
  });

  describe("加载状态", () => {
    it("setInitialLoading 设置加载状态", () => {
      useAppStore.getState().setInitialLoading(false);
      expect(useAppStore.getState().isInitialLoading).toBe(false);
    });
  });
});
