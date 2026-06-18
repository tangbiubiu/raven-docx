// agent-sidebar.test.tsx — AgentSidebar 组件测试
// 验证 Tab 切换、CommentPanel 内嵌、QuickActions 集成等核心交互
// Reference: .dev/plan/ui-layout-alignment.md §4.1-4.3

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { AgentSidebar } from "../agent-sidebar";

// Regex patterns for accessibility and text matching
const AGENT_REGEX = /Agent/;
const AGENT_FEATURE_REGEX = /Agent 功能/;
// Mock hooks
vi.mock("../../hooks/useAgentSession", () => ({
  useAgentSession: () => ({
    status: "idle",
    error: null,
    messages: [],
    isStreaming: false,
    send: vi.fn(),
    abort: vi.fn(),
    retry: vi.fn(),
    clear: vi.fn(),
    contextBadge: null,
  }),
}));

vi.mock("../../hooks/useAgentContext", () => ({
  useAgentContext: () => ({
    getSelectionContext: vi.fn(),
    buildPrompt: vi.fn(),
  }),
}));

// Mock CommentPanel to avoid deep rendering
vi.mock("@/features/review/components/comment-panel", () => ({
  CommentPanel: ({ embedded }: { embedded?: boolean }) => (
    <div
      data-embedded={embedded ? "true" : "false"}
      data-testid="comment-panel"
    >
      CommentPanel Mock
    </div>
  ),
}));

describe("AgentSidebar", () => {
  beforeEach(() => {
    useAppStore.setState({ agentSidebarOpen: true });
    useDocumentStore.getState().closeDocument();
  });

  describe("阶段1：核心布局", () => {
    it("侧边栏关闭时显示折叠按钮", () => {
      useAppStore.setState({ agentSidebarOpen: false });
      render(<AgentSidebar />);
      expect(screen.getByLabelText(AGENT_REGEX)).toBeInTheDocument();
    });

    it("侧边栏打开时显示对话/批注 Tab", () => {
      render(<AgentSidebar />);
      expect(screen.getByText("对话")).toBeInTheDocument();
      expect(screen.getByText("批注")).toBeInTheDocument();
    });

    it("默认显示「对话」Tab", () => {
      render(<AgentSidebar />);
      // CommentPanel 在对话 Tab 下不渲染
      expect(screen.queryByTestId("comment-panel")).not.toBeInTheDocument();
    });

    it("切换到「批注」Tab 时渲染 CommentPanel embedded", async () => {
      const user = userEvent.setup();
      render(<AgentSidebar />);

      await user.click(screen.getByText("批注"));
      const panel = screen.getByTestId("comment-panel");
      expect(panel).toBeInTheDocument();
      expect(panel.getAttribute("data-embedded")).toBe("true");
    });

    it("切换回「对话」Tab 时隐藏 CommentPanel", async () => {
      const user = userEvent.setup();
      render(<AgentSidebar />);

      await user.click(screen.getByText("批注"));
      expect(screen.getByTestId("comment-panel")).toBeInTheDocument();

      await user.click(screen.getByText("对话"));
      expect(screen.queryByTestId("comment-panel")).not.toBeInTheDocument();
    });

    it("无文档时显示自由模式提示", () => {
      render(<AgentSidebar />);
      // 无文档打开时，输入框上方显示自由模式提示
      expect(screen.getByText(AGENT_FEATURE_REGEX)).toBeInTheDocument();
    });
  });

  describe("阶段2：QuickActions 集成", () => {
    it("对话 Tab 内渲染 QuickActions 8 个按钮", () => {
      render(<AgentSidebar />);
      expect(screen.getByText("续写")).toBeInTheDocument();
      expect(screen.getByText("润色")).toBeInTheDocument();
      expect(screen.getByText("摘要")).toBeInTheDocument();
      expect(screen.getByText("扩写")).toBeInTheDocument();
      expect(screen.getByText("翻译")).toBeInTheDocument();
      expect(screen.getByText("风格检查")).toBeInTheDocument();
      expect(screen.getByText("更正式")).toBeInTheDocument();
      expect(screen.getByText("解释")).toBeInTheDocument();
    });

    it("批注 Tab 不显示 QuickActions", async () => {
      const user = userEvent.setup();
      render(<AgentSidebar />);
      await user.click(screen.getByText("批注"));
      expect(screen.queryByText("续写")).not.toBeInTheDocument();
    });
  });
});
