// biome-ignore-all lint/performance/useTopLevelRegex: test file — regex in assertions is standard
// features/editor/components/__tests__/OutlinePanel.test.tsx — OutlinePanel 组件测试
// TDD: 红阶段 → 绿阶段 → 重构

import type {
  DocumentBody,
  Paragraph,
} from "@eigenpal/docx-editor-core/types/content";
import type {
  Document,
  DocxPackage,
} from "@eigenpal/docx-editor-core/types/document";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { OutlinePanel } from "../OutlinePanel";

/** 创建一个测试用的 Paragraph */
function makeParagraph(paraId: string, level: number, text: string): Paragraph {
  return {
    type: "paragraph",
    paraId,
    formatting: { outlineLevel: level },
    content: [
      {
        type: "run",
        content: [{ type: "text", text }],
      },
    ],
  };
}

/** 创建带标题的测试文档 */
function makeDocWithHeadings(paragraphs: Paragraph[]): Document {
  const body: DocumentBody = {
    content: paragraphs,
  };
  const pkg: DocxPackage = {
    document: body,
  };
  const doc: Document = {
    package: pkg,
  };
  return doc;
}

describe("OutlinePanel", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
    useAppStore.getState().setOutlinePanelCollapsed?.(false);
  });

  it("editorBridge 为 null 时显示空状态", () => {
    useDocumentStore.getState().setEditorBridge(null);
    render(<OutlinePanel />);
    expect(screen.getByText(/暂无可导航标题/)).toBeInTheDocument();
  });

  it("getDocument 返回 null 时显示空状态", () => {
    useDocumentStore.getState().setEditorBridge({
      getDocument: () => null,
    } as never);
    render(<OutlinePanel />);
    expect(screen.getByText(/暂无可导航标题/)).toBeInTheDocument();
  });

  it("无标题段落时显示空状态", () => {
    const doc = makeDocWithHeadings([]);
    useDocumentStore.getState().setEditorBridge({
      getDocument: () => doc,
      scrollToParaId: vi.fn(),
    } as never);
    render(<OutlinePanel />);
    expect(screen.getByText(/暂无可导航标题/)).toBeInTheDocument();
  });

  it("有标题时渲染大纲树", () => {
    const doc = makeDocWithHeadings([
      makeParagraph("p1", 0, "Heading 1"),
      makeParagraph("p2", 1, "Heading 2"),
    ]);
    const scrollToParaId = vi.fn();
    useDocumentStore.getState().setEditorBridge({
      getDocument: () => doc,
      scrollToParaId,
    } as never);
    render(<OutlinePanel />);

    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Heading 2")).toBeInTheDocument();
  });

  it("点击标题调用 scrollToParaId", async () => {
    const doc = makeDocWithHeadings([
      makeParagraph("target-para", 0, "Jump Here"),
    ]);
    const scrollToParaId = vi.fn();
    useDocumentStore.getState().setEditorBridge({
      getDocument: () => doc,
      scrollToParaId,
    } as never);
    const user = userEvent.setup();
    render(<OutlinePanel />);

    await user.click(screen.getByText("Jump Here"));
    expect(scrollToParaId).toHaveBeenCalledWith("target-para");
  });

  it("collapsed 时返回 null", () => {
    useAppStore.setState({ outlinePanelCollapsed: true });
    const { container } = render(<OutlinePanel />);
    expect(container.firstChild).toBeNull();
  });
});
