// features/document/components/__tests__/DocumentTitleBar.test.tsx — 文档标题栏测试
// Reference: .dev/plan/implementation-plan.md §Phase 2.3

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentTitleBar } from "../document-title-bar";
import { useDocumentStore } from "@/stores/useDocumentStore";

describe("DocumentTitleBar", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
  });

  it("未打开文档时显示「未命名文档」", () => {
    render(<DocumentTitleBar onNew={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText("未命名文档")).toBeInTheDocument();
  });

  it("打开文档后显示文件名", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/Users/test/my-document.docx"
    );

    render(<DocumentTitleBar onNew={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText("my-document.docx")).toBeInTheDocument();
  });

  it("文档已保存时显示「已保存」", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/tmp/test.docx"
    );

    render(<DocumentTitleBar onNew={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText("已保存")).toBeInTheDocument();
  });

  it("文档未保存时显示「未保存」", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/tmp/test.docx"
    );
    useDocumentStore.getState().setDirty(true);

    render(<DocumentTitleBar onNew={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText("未保存")).toBeInTheDocument();
  });

  it("未保存时显示修改标记 ●", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/tmp/test.docx"
    );
    useDocumentStore.getState().setDirty(true);

    render(<DocumentTitleBar onNew={vi.fn()} onOpen={vi.fn()} />);

    // ● 渲染为文本
    expect(screen.getByText("●")).toBeInTheDocument();
  });

  it("点击「新建」按钮触发 onNew", async () => {
    const onNew = vi.fn();
    const user = userEvent.setup();

    render(<DocumentTitleBar onNew={onNew} onOpen={vi.fn()} />);

    const newBtn = screen.getByText("新建");
    await user.click(newBtn);

    expect(onNew).toHaveBeenCalledOnce();
  });

  it("点击「打开」按钮触发 onOpen", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    render(<DocumentTitleBar onNew={vi.fn()} onOpen={onOpen} />);

    const openBtn = screen.getByText("打开…");
    await user.click(openBtn);

    expect(onOpen).toHaveBeenCalledOnce();
  });
});
