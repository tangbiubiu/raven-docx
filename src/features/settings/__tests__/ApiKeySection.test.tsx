// biome-ignore-all lint/performance/useTopLevelRegex: test file patterns
// biome-ignore-all lint/style/useThrowOnlyError: Tauri IPC requires throwing strings
// features/settings/__tests__/ApiKeySection.test.tsx — ApiKeySection 组件测试
// Reference: .dev/docs/modules/features/settings.md §2

import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { ApiKeySection } from "../components/ApiKeySection";

describe("ApiKeySection", () => {
  beforeEach(() => {
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") {
        return;
      }
      if (cmd === "set_api_key") {
        return null;
      }
      if (cmd === "pi_test_connection") {
        return true;
      }
      return null;
    });
    localStorage.clear();
    useSettingsStore.getState().resetAll();
  });

  afterEach(() => {
    clearMocks();
  });

  it("渲染 Provider 选择下拉", () => {
    render(<ApiKeySection />);
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
    expect(screen.getByText("服务商")).toBeInTheDocument();
  });

  it("渲染 API Key 输入框（密码模式）", () => {
    render(<ApiKeySection />);
    const input = screen.getByPlaceholderText("输入 API Key");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
  });

  it("点击眼睛图标切换 Key 显示/隐藏", async () => {
    const user = userEvent.setup();
    render(<ApiKeySection />);

    const toggleBtn = screen.getByRole("button", { name: "显示 API Key" });
    expect(toggleBtn).toBeInTheDocument();

    const input = screen.getByPlaceholderText("输入 API Key");
    expect(input).toHaveAttribute("type", "password");

    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "text");
  });

  it("渲染模型选择下拉", () => {
    render(<ApiKeySection />);
    expect(screen.getByText("模型")).toBeInTheDocument();
  });

  it("渲染 Base URL 输入框", () => {
    render(<ApiKeySection />);
    expect(
      screen.getByPlaceholderText("https://api.example.com")
    ).toBeInTheDocument();
  });

  it("渲染测试连接按钮", () => {
    render(<ApiKeySection />);
    expect(
      screen.getByRole("button", { name: /测试连接/ })
    ).toBeInTheDocument();
  });

  it("测试连接按钮在无 API Key 时禁用", () => {
    render(<ApiKeySection />);
    const btn = screen.getByRole("button", { name: /测试连接/ });
    expect(btn).toBeDisabled();
  });

  it("测试连接显示成功状态", async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().setApiConfig({ apiKey: "sk-test" });

    render(<ApiKeySection />);
    const btn = screen.getByRole("button", { name: /测试连接/ });
    expect(btn).toBeEnabled();

    await user.click(btn);
    expect(screen.getByText(/连接成功/)).toBeInTheDocument();
  });

  it("测试连接失败显示错误状态", async () => {
    clearMocks();
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") {
        return;
      }
      if (cmd === "pi_test_connection") {
        throw "Connection failed";
      }
      return null;
    });

    const user = userEvent.setup();
    useSettingsStore.getState().setApiConfig({ apiKey: "sk-test" });

    render(<ApiKeySection />);
    await user.click(screen.getByRole("button", { name: /测试连接/ }));
    expect(screen.getByText(/连接失败/)).toBeInTheDocument();
  });
});
