// features/table/__tests__/InsertImageButton.test.tsx — InsertImageButton 测试
// 测试图片插入按钮的渲染和文件选择

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsertImageButton } from "../components/InsertImageButton";

// Mock useTableOperations hook
const mockInsertImage = vi.fn();
vi.mock("../hooks/useTableOperations", () => ({
  useTableOperations: () => ({
    insertImage: mockInsertImage,
  }),
}));

describe("InsertImageButton", () => {
  beforeEach(() => {
    mockInsertImage.mockClear();
  });

  it("渲染插入图片按钮", () => {
    render(<InsertImageButton />);
    const button = screen.getByTestId("insert-image-btn");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label");
  });

  it("点击按钮触发隐藏的文件输入框", () => {
    render(<InsertImageButton />);
    const button = screen.getByTestId("insert-image-btn");
    const fileInput = screen.getByTestId(
      "image-file-input"
    ) as HTMLInputElement;

    // Mock file input click
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("选择文件后调用 insertImage", async () => {
    render(<InsertImageButton />);
    const fileInput = screen.getByTestId(
      "image-file-input"
    ) as HTMLInputElement;

    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Wait for async operation
    await vi.waitFor(() => {
      expect(mockInsertImage).toHaveBeenCalled();
    });
  });

  it("取消文件选择时不调用 insertImage", () => {
    render(<InsertImageButton />);
    const fileInput = screen.getByTestId(
      "image-file-input"
    ) as HTMLInputElement;

    // Simulate cancel (no files)
    Object.defineProperty(fileInput, "files", {
      value: [],
      writable: false,
    });

    fireEvent.change(fileInput);
    expect(mockInsertImage).not.toHaveBeenCalled();
  });
});
