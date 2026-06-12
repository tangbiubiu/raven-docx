// biome-ignore-all lint/performance/useTopLevelRegex: Tauri IPC mocking requires this
// biome-ignore-all lint/style/useThrowOnlyError: Tauri IPC requires throwing strings
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./app";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useAppStore } from "./stores/useAppStore";

// 初始化 store 为已加载状态，跳过异步 init
function setupLoadedStore() {
  useSettingsStore.setState({
    isLoaded: true,
    apiConfig: {
      provider: "anthropic",
      apiKey: "",
      baseUrl: "",
      model: "claude-sonnet-4",
    },
    modelConfig: {
      thinking: "auto",
      streaming: true,
    },
    editorConfig: {
      theme: "system",
      locale: "zh-CN",
      defaultFontSize: 15,
      autoSave: true,
      spellCheck: true,
    },
  });
  useAppStore.setState({ isInitialLoading: false });
}

describe("App", () => {
  beforeEach(() => {
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") {
        return;
      }
      if (cmd === "plugin:event|listen") {
        return () => {};
      }
      throw `Unknown command: ${cmd}`;
    });
    setupLoadedStore();
  });

  afterEach(() => {
    clearMocks();
  });

  it("renders the workspace layout without crashing", () => {
    render(<App />);

    expect(screen.getByRole("menubar")).toBeInTheDocument();
    expect(screen.getByText("文件")).toBeInTheDocument();
    expect(screen.getByText("编辑")).toBeInTheDocument();
    expect(screen.getByText("视图")).toBeInTheDocument();
    expect(screen.getByText("插入")).toBeInTheDocument();
    expect(screen.getByText("格式")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("帮助")).toBeInTheDocument();
  });

  it("renders the toolbar placeholder", () => {
    render(<App />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("renders the editor pane placeholder", () => {
    render(<App />);
    const pageArea = document.querySelector(".max-w-\\[760px\\]");
    expect(pageArea).toBeInTheDocument();
  });

  it("renders the status bar", () => {
    render(<App />);
    expect(screen.getByText(/第/)).toBeInTheDocument();
    expect(screen.getByText(/0 字/)).toBeInTheDocument();
  });

  it("closes agent sidebar and shows toggle button", () => {
    useAppStore.getState().setAgentSidebarOpen(false);

    render(<App />);
    expect(screen.getByRole("button", { name: /Agent/ })).toBeInTheDocument();
  });

  it("renders the outline panel", () => {
    render(<App />);
    expect(screen.getByText("大纲")).toBeInTheDocument();
  });
});