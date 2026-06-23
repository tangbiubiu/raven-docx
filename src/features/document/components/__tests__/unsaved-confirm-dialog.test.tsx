// features/document/components/__tests__/unsaved-confirm-dialog.test.tsx
// 窗口关闭时未保存确认对话框测试

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedConfirmDialog } from "../unsaved-confirm-dialog";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

describe("UnsavedConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open=false 时不渲染对话框", () => {
    render(
      <UnsavedConfirmDialog
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
        open={false}
      />
    );
    expect(screen.queryByText("dialog.unsavedTitle")).not.toBeInTheDocument();
  });

  it("open=true 时渲染标题和三个操作按钮", () => {
    render(
      <UnsavedConfirmDialog
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
        open={true}
      />
    );
    expect(screen.getByText("dialog.unsavedTitle")).toBeInTheDocument();
    expect(screen.getByText("dialog.unsavedMessage")).toBeInTheDocument();
    expect(screen.getByText("document.save")).toBeInTheDocument();
    expect(screen.getByText("dialog.discardChanges")).toBeInTheDocument();
    expect(screen.getByText("dialog.cancel")).toBeInTheDocument();
  });

  it("点击保存按钮触发 onSave", () => {
    const onSave = vi.fn();
    render(
      <UnsavedConfirmDialog
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        onSave={onSave}
        open={true}
      />
    );
    fireEvent.click(screen.getByText("document.save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("点击放弃更改按钮触发 onDiscard", () => {
    const onDiscard = vi.fn();
    render(
      <UnsavedConfirmDialog
        onCancel={vi.fn()}
        onDiscard={onDiscard}
        onSave={vi.fn()}
        open={true}
      />
    );
    fireEvent.click(screen.getByText("dialog.discardChanges"));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("点击取消按钮触发 onCancel", () => {
    const onCancel = vi.fn();
    render(
      <UnsavedConfirmDialog
        onCancel={onCancel}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
        open={true}
      />
    );
    fireEvent.click(screen.getByText("dialog.cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("点击遮罩层（不关闭）不触发任何回调", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();
    render(
      <UnsavedConfirmDialog
        onCancel={onCancel}
        onDiscard={onDiscard}
        onSave={onSave}
        open={true}
      />
    );
    // Escape / 遮罩点击应被阻止，避免误操作丢失数据
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
