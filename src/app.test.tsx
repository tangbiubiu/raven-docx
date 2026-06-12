// biome-ignore-all lint/performance/useTopLevelRegex: This doesn't get called often to be a performance bottleneck
// biome-ignore-all lint/style/useThrowOnlyError: Tauri IPC requires throwing strings
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./app";

describe("App", () => {
  beforeEach(() => {
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") {
        return;
      }
      return null;
    });

    localStorage.clear();
  });

  afterEach(() => {
    clearMocks();
  });

  it("renders the workspace page", () => {
    render(<App />);
    // 页面有两个 "geex-docx"（标题栏 + 主内容区）
    expect(screen.getAllByText("geex-docx")).toHaveLength(2);
  });

  it("shows API Key configuration prompt", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /配置 API Key/i })
    ).toBeInTheDocument();
  });

  it("shows 'not configured' in status bar", () => {
    render(<App />);
    expect(screen.getByText("⚠ 未配置 API Key")).toBeInTheDocument();
  });

  it("auto-opens SettingsDrawer on first launch when no API Key", () => {
    render(<App />);
    // 首次启动无 API Key → SettingsDrawer 自动打开
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
  });

  it("closes SettingsDrawer when clicking Done", async () => {
    const user = userEvent.setup();
    render(<App />);

    // SettingsDrawer 已自动打开
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /完成/ }));
    expect(screen.queryByText("API Key 配置")).not.toBeInTheDocument();
  });

  it("closes SettingsDrawer when pressing Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("API Key 配置")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("API Key 配置")).not.toBeInTheDocument();
  });

  it("reopens SettingsDrawer when clicking configure button", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 先关闭自动打开的 drawer
    await user.keyboard("{Escape}");
    expect(screen.queryByText("API Key 配置")).not.toBeInTheDocument();

    // 点击按钮重新打开
    await user.click(screen.getByRole("button", { name: /配置 API Key/i }));
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
  });
});
