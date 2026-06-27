// features/editor/components/__tests__/OutlinePanel.test.tsx — OutlinePanel 组件测试
// TDD: 红阶段 → 绿阶段 → 重构

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import type { OutlineItem } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { OutlinePanel } from "../OutlinePanel";

const NO_HEADINGS_RE = /暂无可导航标题/;
/** 创建测试用 OutlineItem */
function makeHeading(paraId: string, level: number, text: string): OutlineItem {
  return { paraId, level, text };
}

describe("OutlinePanel", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
    useAppStore.getState().setOutlinePanelCollapsed?.(false);
  });

  it("headings 为空时显示空状态", () => {
    useDocumentStore.getState().setHeadings([]);
    render(<OutlinePanel />);
    expect(screen.getByText(NO_HEADINGS_RE)).toBeInTheDocument();
  });

  it("有标题时渲染大纲树", () => {
    const scrollToParaId = vi.fn();
    useDocumentStore.getState().setEditorBridge({
      scrollToParaId,
    } as never);
    useDocumentStore
      .getState()
      .setHeadings([
        makeHeading("p1", 0, "Heading 1"),
        makeHeading("p2", 1, "Heading 2"),
      ]);
    render(<OutlinePanel />);

    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Heading 2")).toBeInTheDocument();
  });

  it("点击标题调用 scrollToParaId", async () => {
    const scrollToParaId = vi.fn();
    useDocumentStore.getState().setEditorBridge({
      scrollToParaId,
    } as never);
    useDocumentStore
      .getState()
      .setHeadings([makeHeading("target-para", 0, "Jump Here")]);
    const user = userEvent.setup();
    render(<OutlinePanel />);

    await user.click(screen.getByText("Jump Here"));
    expect(scrollToParaId).toHaveBeenCalledWith("target-para");
  });
});
