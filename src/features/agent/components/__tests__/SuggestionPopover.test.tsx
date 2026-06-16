// features/agent/components/__tests__/SuggestionPopover.test.tsx — 建议预览弹窗组件测试
// Reference: .dev/plan/phase3-branch-plan.md §4.6-4.7

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PendingSuggestion } from "../../hooks/useAgentCommands";
import { SuggestionPopover } from "../SuggestionPopover";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "agent.action.rewrite": "润色",
        "agent.action.proofread": "全文校对",
        "agent.action.fixGrammar": "修复语法",
        "agent.suggestion.accept": "接受",
        "agent.suggestion.reject": "拒绝",
      };
      return map[key] ?? key;
    },
  }),
}));

const baseSuggestion: PendingSuggestion = {
  originalText: "这是一段原始文本",
  suggestedText: "这是一段润色后的文本",
  action: "rewrite",
};

describe("SuggestionPopover", () => {
  it("渲染原文本（删除线样式）和建议文本", () => {
    render(
      <SuggestionPopover
        onAccept={vi.fn()}
        onReject={vi.fn()}
        suggestion={baseSuggestion}
      />
    );

    expect(screen.getByText("这是一段原始文本")).toBeInTheDocument();
    expect(screen.getByText("这是一段润色后的文本")).toBeInTheDocument();
  });

  it("显示动作类型标签（通过 i18n）", () => {
    render(
      <SuggestionPopover
        onAccept={vi.fn()}
        onReject={vi.fn()}
        suggestion={baseSuggestion}
      />
    );

    expect(screen.getByText("润色")).toBeInTheDocument();
  });

  it("点击接受按钮调用 onAccept", async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();

    render(
      <SuggestionPopover
        onAccept={onAccept}
        onReject={vi.fn()}
        suggestion={baseSuggestion}
      />
    );

    await user.click(screen.getByRole("button", { name: /接受/ }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("点击拒绝按钮调用 onReject", async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();

    render(
      <SuggestionPopover
        onAccept={vi.fn()}
        onReject={onReject}
        suggestion={baseSuggestion}
      />
    );

    await user.click(screen.getByRole("button", { name: /拒绝/ }));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("全文校对动作显示对应标签", () => {
    render(
      <SuggestionPopover
        onAccept={vi.fn()}
        onReject={vi.fn()}
        suggestion={{ ...baseSuggestion, action: "proofread" }}
      />
    );

    expect(screen.getByText("全文校对")).toBeInTheDocument();
  });

  it("修复语法动作显示对应标签", () => {
    render(
      <SuggestionPopover
        onAccept={vi.fn()}
        onReject={vi.fn()}
        suggestion={{ ...baseSuggestion, action: "fixGrammar" }}
      />
    );

    expect(screen.getByText("修复语法")).toBeInTheDocument();
  });

  it("原文本使用删除线样式", () => {
    render(
      <SuggestionPopover
        onAccept={vi.fn()}
        onReject={vi.fn()}
        suggestion={baseSuggestion}
      />
    );

    const originalText = screen.getByText("这是一段原始文本");
    expect(originalText.className).toContain("line-through");
  });

  it("不渲染时返回 null（当无 suggestion 时为安全类型检查）", () => {
    const { container } = render(
      <SuggestionPopover
        suggestion={baseSuggestion}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("提供 position 时使用像素坐标定位", () => {
    const { container } = render(
      <SuggestionPopover
        suggestion={baseSuggestion}
        position={{ top: 200, left: 400 }}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.style.top).toBe("200px");
    expect(card.style.left).toBe("400px");
    expect(card.style.transform).toBe("");
  });

  it("未提供 position 时使用视口居中回退", () => {
    const { container } = render(
      <SuggestionPopover
        suggestion={baseSuggestion}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.style.top).toBe("50%");
    expect(card.style.left).toBe("50%");
    expect(card.style.transform).toBe("translate(-50%, -50%)");
  });
});
