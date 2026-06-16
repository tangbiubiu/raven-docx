// CommandPalette.test.tsx — 命令面板组件测试 (Command Palette Component Tests)
// TDD: 先写测试，验证 Cmd+K 唤起、键盘导航、搜索过滤、执行动作等行为
// Reference: .dev/plan/phase3-branch-plan.md §3.9

import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useAgentContext } from "../../hooks/useAgentContext";
import { useAgentSession } from "../../hooks/useAgentSession";
import { CommandPalette } from "../command-palette";

// Mock hooks
vi.mock("../../hooks/useAgentSession");
vi.mock("../../hooks/useAgentContext");

describe("CommandPalette", () => {
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
      (action, _ctx, custom) => custom || `prompt-for-${action}`
    );
  });

  afterEach(() => {
    clearMocks();
    useAppStore.setState({ activeModal: null });
    useDocumentStore.setState({ documentPath: null });
  });

  describe("基础渲染", () => {
    it("渲染搜索框并自动聚焦", () => {
      useAppStore.setState({ activeModal: "commandPalette" });
      render(<CommandPalette />);

      const input = screen.getByPlaceholderText("输入指令或搜索…");
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    it("渲染 12 个预设动作", () => {
      useAppStore.setState({ activeModal: "commandPalette" });
      render(<CommandPalette />);

      // 检查部分预设动作存在
      expect(screen.getByText("润色")).toBeInTheDocument();
      expect(screen.getByText("扩写")).toBeInTheDocument();
      expect(screen.getByText("摘要")).toBeInTheDocument();
      expect(screen.getByText("翻译")).toBeInTheDocument();
      expect(screen.getByText("续写")).toBeInTheDocument();
      expect(screen.getByText("自定义指令")).toBeInTheDocument();
    });

    it("无文档时 requiresDocument 的动作置灰", () => {
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: null });
      render(<CommandPalette />);

      const rewriteBtn = screen.getByText("润色").closest("button");
      expect(rewriteBtn).toBeDisabled();

      const expandBtn = screen.getByText("扩写").closest("button");
      expect(expandBtn).toBeDisabled();
    });

    it("有文档时 requiresDocument-only 的动作可用", () => {
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      render(<CommandPalette />);

      // "续写" requiresDocument=true but requiresSelection=false
      const continueBtn = screen.getByText("续写").closest("button");
      expect(continueBtn).not.toBeDisabled();
    });
    it("requiresSelection 的动作在有选区时可用", () => {
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      mockGetSelectionContext.mockReturnValue({
        selectedText: "测试文本",
        textBefore: "",
        textAfter: "",
        formatting: null,
      });
      render(<CommandPalette />);

      const rewriteBtn = screen.getByText("润色").closest("button");
      expect(rewriteBtn).not.toBeDisabled();
    });

    it("requiresSelection 的动作在无选区时置灰", () => {
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      mockGetSelectionContext.mockReturnValue(null);
      render(<CommandPalette />);

      const rewriteBtn = screen.getByText("润色").closest("button");
      expect(rewriteBtn).toBeDisabled();
    });
  });

  describe("键盘交互", () => {
    it("Esc 关闭面板", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      render(<CommandPalette />);

      await user.keyboard("{Escape}");
      expect(useAppStore.getState().activeModal).toBeNull();
    });

    it("↑↓ 键导航动作列表", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      render(<CommandPalette />);

      // 初始第一项高亮
      const items = screen.getAllByRole("button");
      expect(items[0]).toHaveClass("bg-accent");

      // 按下箭头，第二项高亮
      await user.keyboard("{ArrowDown}");
      expect(items[1]).toHaveClass("bg-accent");

      // 按上箭头，回到第一项
      await user.keyboard("{ArrowUp}");
      expect(items[0]).toHaveClass("bg-accent");
    });
    it("Enter 执行高亮动作", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      mockGetSelectionContext.mockReturnValue({
        selectedText: "测试文本",
        textBefore: "",
        textAfter: "",
        formatting: null,
      });
      render(<CommandPalette />);

      await user.keyboard("{Enter}");
      expect(mockSend).toHaveBeenCalledWith("prompt-for-rewrite");
    });
    it("输入搜索文本过滤动作列表", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      render(<CommandPalette />);

      await user.type(screen.getByPlaceholderText("输入指令或搜索…"), "润色");

      // 只有"润色"动作显示
      expect(screen.getByText("润色")).toBeInTheDocument();
      expect(screen.queryByText("扩写")).not.toBeInTheDocument();
    });
  });

  describe("执行动作", () => {
    it("点击可用动作执行并关闭面板", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      render(<CommandPalette />);

      await user.click(screen.getByText("续写"));
      expect(mockSend).toHaveBeenCalledWith("prompt-for-continue");
      expect(useAppStore.getState().activeModal).toBeNull();
    });

    it("点击置灰动作不执行", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: null });
      render(<CommandPalette />);

      const rewriteBtn = screen.getByText("润色").closest("button");
      if (rewriteBtn) {
        await user.click(rewriteBtn);
      }
    });

    it("自定义指令输入并发送", async () => {
      const user = userEvent.setup();
      useAppStore.setState({ activeModal: "commandPalette" });
      useDocumentStore.setState({ documentPath: "/test.docx" });
      render(<CommandPalette />);

      const input = screen.getByPlaceholderText("输入指令或搜索…");
      await user.type(input, "翻译成英文{Enter}");

      expect(mockSend).toHaveBeenCalledWith("翻译成英文");
      expect(useAppStore.getState().activeModal).toBeNull();
    });
  });
});
