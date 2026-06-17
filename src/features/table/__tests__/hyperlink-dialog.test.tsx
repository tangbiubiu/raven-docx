// features/table/__tests__/HyperlinkDialog.test.tsx — HyperlinkDialog 测试
// 测试超链接对话框的渲染和交互

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HyperlinkDialog } from "../components/HyperlinkDialog";

// Mock useTableOperations hook
const mockInsertHyperlink = vi.fn();
vi.mock("../hooks/useTableOperations", () => ({
  useTableOperations: () => ({
    insertHyperlink: mockInsertHyperlink,
  }),
}));

describe("HyperlinkDialog", () => {
  beforeEach(() => {
    mockInsertHyperlink.mockClear();
  });

  it("渲染对话框标题和输入框", () => {
    render(<HyperlinkDialog onClose={vi.fn()} />);
    expect(screen.getByTestId("hyperlink-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("hyperlink-text-input")).toBeInTheDocument();
    expect(screen.getByTestId("hyperlink-url-input")).toBeInTheDocument();
  });

  it("输入 URL 和显示文本后插入链接", () => {
    const onClose = vi.fn();
    render(<HyperlinkDialog onClose={onClose} />);

    fireEvent.change(screen.getByTestId("hyperlink-text-input"), {
      target: { value: "Click here" },
    });
    fireEvent.change(screen.getByTestId("hyperlink-url-input"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByTestId("hyperlink-insert-btn"));

    expect(mockInsertHyperlink).toHaveBeenCalledWith(
      "https://example.com",
      "Click here"
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("URL 为空时禁用插入按钮", () => {
    render(<HyperlinkDialog onClose={vi.fn()} />);
    const insertBtn = screen.getByTestId("hyperlink-insert-btn");
    expect(insertBtn).toBeDisabled();
  });

  it("显示文本为空时使用 URL 作为显示文本", () => {
    const onClose = vi.fn();
    render(<HyperlinkDialog onClose={onClose} />);

    fireEvent.change(screen.getByTestId("hyperlink-url-input"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByTestId("hyperlink-insert-btn"));

    expect(mockInsertHyperlink).toHaveBeenCalledWith("https://example.com", "");
    expect(onClose).toHaveBeenCalled();
  });

  it("点击取消按钮关闭对话框", () => {
    const onClose = vi.fn();
    render(<HyperlinkDialog onClose={onClose} />);

    fireEvent.click(screen.getByTestId("hyperlink-cancel-btn"));
    expect(onClose).toHaveBeenCalled();
    expect(mockInsertHyperlink).not.toHaveBeenCalled();
  });
});
