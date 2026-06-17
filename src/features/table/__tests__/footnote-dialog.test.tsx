// features/table/__tests__/FootnoteDialog.test.tsx — FootnoteDialog 测试
// 测试脚注对话框的渲染和交互

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FootnoteDialog } from "../components/FootnoteDialog";

const mockInsertFootnote = vi.fn();
vi.mock("../hooks/useTableOperations", () => ({
  useTableOperations: () => ({
    insertFootnote: mockInsertFootnote,
  }),
}));

describe("FootnoteDialog", () => {
  beforeEach(() => {
    mockInsertFootnote.mockClear();
  });

  it("渲染脚注对话框", () => {
    render(<FootnoteDialog onClose={vi.fn()} />);
    expect(screen.getByTestId("footnote-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("footnote-text-input")).toBeInTheDocument();
  });

  it("点击插入按钮调用 insertFootnote", () => {
    const onClose = vi.fn();
    render(<FootnoteDialog onClose={onClose} />);

    fireEvent.change(screen.getByTestId("footnote-text-input"), {
      target: { value: "这是脚注内容" },
    });
    fireEvent.click(screen.getByTestId("footnote-insert-btn"));

    expect(mockInsertFootnote).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("点击取消关闭对话框", () => {
    const onClose = vi.fn();
    render(<FootnoteDialog onClose={onClose} />);

    fireEvent.click(screen.getByTestId("footnote-cancel-btn"));
    expect(onClose).toHaveBeenCalled();
    expect(mockInsertFootnote).not.toHaveBeenCalled();
  });
});
