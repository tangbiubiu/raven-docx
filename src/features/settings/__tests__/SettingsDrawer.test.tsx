// biome-ignore-all lint/performance/useTopLevelRegex: test file patterns
// biome-ignore-all lint/style/useThrowOnlyError: Tauri IPC throws strings
// features/settings/__tests__/SettingsDrawer.test.tsx — SettingsDrawer 组件测试
// Reference: .dev/docs/modules/pages/settings-drawer.md

import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { SettingsDrawer } from "../components/SettingsDrawer";

describe("SettingsDrawer", () => {
  beforeEach(() => {
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") {
        return;
      }
      return null;
    });
    localStorage.clear();
    useSettingsStore.getState().resetAll();
    useAppStore.setState({
      settingsDrawerOpen: false,
    });
  });

  afterEach(() => {
    clearMocks();
  });

  it("渲染抽屉标题", () => {
    render(<SettingsDrawer />);
    expect(screen.getByText("设置")).toBeInTheDocument();
  });

  it("渲染所有设置区域", () => {
    render(<SettingsDrawer />);
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
    expect(screen.getByText("模型设置")).toBeInTheDocument();
    expect(screen.getByText("编辑器偏好")).toBeInTheDocument();
    expect(screen.getByText("数据管理")).toBeInTheDocument();
  });

  it("点击「完成」按钮关闭抽屉", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const originalClose = useAppStore.getState().setSettingsDrawerOpen;
    await act(() => {
      useAppStore.setState({ setSettingsDrawerOpen: handleClose });
    });

    render(<SettingsDrawer />);
    await user.click(screen.getByRole("button", { name: /完成/ }));
    expect(handleClose).toHaveBeenCalledWith(false);

    await act(() => {
      useAppStore.setState({ setSettingsDrawerOpen: originalClose });
    });
  });

  it("点击遮罩层关闭抽屉", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const originalClose = useAppStore.getState().setSettingsDrawerOpen;

    await act(() => {
      useAppStore.setState({ setSettingsDrawerOpen: handleClose });
    });

    render(<SettingsDrawer />);
    const overlay = document.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
    if (overlay) {
      await user.click(overlay);
    }
    expect(handleClose).toHaveBeenCalledWith(false);

    await act(() => {
      useAppStore.setState({ setSettingsDrawerOpen: originalClose });
    });
  });

  it("按 Escape 关闭抽屉", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const originalClose = useAppStore.getState().setSettingsDrawerOpen;

    await act(() => {
      useAppStore.setState({ setSettingsDrawerOpen: handleClose });
    });

    render(<SettingsDrawer />);
    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledWith(false);

    await act(() => {
      useAppStore.setState({ setSettingsDrawerOpen: originalClose });
    });
  });

  it("initialSection='apiKey' 时自动滚动到 API Key 区域", () => {
    render(<SettingsDrawer initialSection="apiKey" />);
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
  });
});
