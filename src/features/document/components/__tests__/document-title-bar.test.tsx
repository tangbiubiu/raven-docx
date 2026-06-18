// features/document/components/__tests__/DocumentTitleBar.test.tsx — 文档标题栏测试
// Reference: .dev/plan/implementation-plan.md §Phase 2.3

import { render, screen } from "@testing-library/react";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { DocumentTitleBar } from "../document-title-bar";

describe("DocumentTitleBar", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
  });

  it("未打开文档时显示「未命名文档」", () => {
    render(<DocumentTitleBar />);

    expect(screen.getByText("未命名文档")).toBeInTheDocument();
  });

  it("打开文档后显示文件名", () => {
    useDocumentStore
      .getState()
      .setDocument(
        {} as unknown,
        new ArrayBuffer(8),
        "/Users/test/my-document.docx"
      );

    render(<DocumentTitleBar />);

    expect(screen.getByText("my-document.docx")).toBeInTheDocument();
  });

  it("文档已保存时显示「已保存」", () => {
    useDocumentStore
      .getState()
      .setDocument({} as unknown, new ArrayBuffer(8), "/tmp/test.docx");

    render(<DocumentTitleBar />);

    expect(screen.getByText("已保存")).toBeInTheDocument();
  });

  it("文档未保存时显示「未保存」", () => {
    useDocumentStore
      .getState()
      .setDocument({} as unknown, new ArrayBuffer(8), "/tmp/test.docx");
    useDocumentStore.getState().setDirty(true);

    render(<DocumentTitleBar />);

    expect(screen.getByText("未保存")).toBeInTheDocument();
  });

  it("未保存时显示修改标记 ●", () => {
    useDocumentStore
      .getState()
      .setDocument({} as unknown, new ArrayBuffer(8), "/tmp/test.docx");
    useDocumentStore.getState().setDirty(true);

    render(<DocumentTitleBar />);

    // ● 渲染为文本
    expect(screen.getByText("●")).toBeInTheDocument();
  });
});
