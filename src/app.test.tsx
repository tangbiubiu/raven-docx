// biome-ignore-all lint/performance/useTopLevelRegex: This doesn't get called often to be a performance bottleneck
// biome-ignore-all lint/style/useThrowOnlyError: Tauri IPC requires throwing strings
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./app";

// Mock DocxEditor to avoid CSS import issues in test environment
vi.mock("@eigenpal/docx-editor-react", () => {
  const DummyDoc = { type: "document", children: [] };
  return {
    DocxEditor: vi.fn(() => <div data-testid="docx-editor">ready</div>),
    createEmptyDocument: vi.fn(() => DummyDoc),
  };
});
// Mock tauri-events to prevent useAgentSession from setting up real event listeners
vi.mock("@/lib/tauri-events", () => ({
  onPiEvent: () => Promise.resolve(vi.fn()),
  onCloseRequested: () => Promise.resolve(vi.fn()),
}));

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
    expect(screen.getByText("未命名文档")).toBeInTheDocument();
  });
  it("shows API Key configuration prompt", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /配置 API Key/i })
    ).toBeInTheDocument();
  });
  it("shows empty editor state when no document", () => {
    render(<App />);
    expect(screen.getByText(/打开或新建一个文档/)).toBeInTheDocument();
  });

  it("auto-opens SettingsDrawer on first launch when no API Key", () => {
    render(<App />);
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
  });

  it("closes SettingsDrawer when clicking Done", async () => {
    const user = userEvent.setup();
    render(<App />);

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

    await user.keyboard("{Escape}");
    expect(screen.queryByText("API Key 配置")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /配置 API Key/i }));
    expect(screen.getByText("API Key 配置")).toBeInTheDocument();
  });
});
