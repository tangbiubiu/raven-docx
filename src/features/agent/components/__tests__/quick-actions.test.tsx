// QuickActions.test.tsx — 快捷操作组件测试 (Quick Actions Component Tests)
// TDD: 验证快捷按钮渲染、点击触发 Agent 动作等行为
// Reference: .dev/plan/phase3-branch-plan.md §3.8, §3.9

import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentContext } from "../../hooks/useAgentContext";
import { useAgentSession } from "../../hooks/useAgentSession";
import { QuickActions } from "../quick-actions";

// Mock hooks
vi.mock("../../hooks/useAgentSession");
vi.mock("../../hooks/useAgentContext");

describe("QuickActions", () => {
  const mockSend = vi.fn();
  const mockBuildPrompt = vi.fn();
  const mockGetSelectionContext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") {
        return;
      }
      return null;
    });

    // Setup default mocks
    vi.mocked(useAgentSession).mockReturnValue({
      status: "ready",
      error: null,
      messages: [],
      isStreaming: false,
      send: mockSend,
      abort: vi.fn(),
      retry: vi.fn(),
      clear: vi.fn(),
      contextBadge: null,
    });

    vi.mocked(useAgentContext).mockReturnValue({
      getFullContext: vi.fn(),
      getSelectionContext: mockGetSelectionContext,
      buildPrompt: mockBuildPrompt,
    });

    mockGetSelectionContext.mockReturnValue(null);
    mockBuildPrompt.mockImplementation(
      (action, _ctx) => `prompt-for-${action}`
    );
  });

  afterEach(() => {
    clearMocks();
  });

  describe("渲染", () => {
    it("渲染 4 个快捷按钮", () => {
      render(<QuickActions />);

      expect(screen.getByText("润色")).toBeInTheDocument();
      expect(screen.getByText("扩写")).toBeInTheDocument();
      expect(screen.getByText("摘要")).toBeInTheDocument();
      expect(screen.getByText("翻译")).toBeInTheDocument();
    });
  });

  describe("点击交互", () => {
    it("点击按钮时如果有选区则发送对应动作", async () => {
      const user = userEvent.setup();
      mockGetSelectionContext.mockReturnValue({
        selectedText: "测试文本",
        textBefore: "",
        textAfter: "",
        formatting: null,
      });
      render(<QuickActions />);

      await user.click(screen.getByText("润色"));
      expect(mockSend).toHaveBeenCalledWith("prompt-for-rewrite", "default");
    });

    it("点击按钮时如果没有选区则不发送", async () => {
      const user = userEvent.setup();
      mockGetSelectionContext.mockReturnValue(null);
      render(<QuickActions />);

      await user.click(screen.getByText("润色"));
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("Agent 忙碌时使用 steer 模式", async () => {
      const user = userEvent.setup();
      vi.mocked(useAgentSession).mockReturnValue({
        status: "busy",
        error: null,
        messages: [],
        isStreaming: true,
        send: mockSend,
        abort: vi.fn(),
        retry: vi.fn(),
        clear: vi.fn(),
        contextBadge: null,
      });
      mockGetSelectionContext.mockReturnValue({
        selectedText: "测试文本",
        textBefore: "",
        textAfter: "",
        formatting: null,
      });
      render(<QuickActions />);

      await user.click(screen.getByText("润色"));
      expect(mockSend).toHaveBeenCalledWith("prompt-for-rewrite", "steer");
    });
  });
});
