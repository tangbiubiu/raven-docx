// features/template/__tests__/variable-form.test.tsx
// VariableForm 组件单元测试 (VariableForm Component Unit Tests)
// Reference: Phase 4.4a

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Dialog 组件避免 jsdom 中 Radix Portal 兼容性问题
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({
    children,
  }: {
    children: ReactNode;
    showCloseButton?: boolean;
  }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

import { VariableForm } from "../components/variable-form";

// Mock useTemplateVars
const mockSetValue = vi.fn();
const mockApplyAll = vi.fn();

vi.mock("../hooks/use-template-vars", () => ({
  useTemplateVars: vi.fn(),
}));

import { useTemplateVars } from "../hooks/use-template-vars";

const mockUseTemplateVars = vi.mocked(useTemplateVars);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VariableForm", () => {
  it("shows empty state when no variables detected", () => {
    mockUseTemplateVars.mockReturnValue({
      hasVariables: false,
      variables: [],
      values: {},
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={vi.fn()} open={true} />);

    expect(screen.getByText("文档中未检测到模板变量")).toBeInTheDocument();
  });

  it("renders form with variable inputs when variables exist", () => {
    mockUseTemplateVars.mockReturnValue({
      hasVariables: true,
      variables: ["name", "company"],
      values: { name: "Alice", company: "Acme" },
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={vi.fn()} open={true} />);

    expect(screen.getByLabelText("name")).toBeInTheDocument();
    expect(screen.getByLabelText("company")).toBeInTheDocument();
  });

  it("allows user to type in input fields", async () => {
    mockUseTemplateVars.mockReturnValue({
      hasVariables: true,
      variables: ["name"],
      values: { name: "" },
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={vi.fn()} open={true} />);

    const input = screen.getByLabelText("name");
    await userEvent.type(input, "Bob");

    // Component uses local state, input value should update
    expect(input).toHaveValue("Bob");
  });

  it("calls setValue and applyAll when user clicks apply button", async () => {
    mockApplyAll.mockResolvedValue(undefined);
    const mockOnOpenChange = vi.fn();

    mockUseTemplateVars.mockReturnValue({
      hasVariables: true,
      variables: ["name"],
      values: { name: "" },
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={mockOnOpenChange} open={true} />);

    const input = screen.getByLabelText("name");
    await userEvent.type(input, "Alice");

    const applyButton = screen.getByRole("button", { name: "填充全部" });
    await userEvent.click(applyButton);

    // setValue is called with the typed value before applyAll
    expect(mockSetValue).toHaveBeenCalledWith("name", "Alice");
    expect(mockApplyAll).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("closes dialog when user clicks cancel button", async () => {
    const mockOnOpenChange = vi.fn();

    mockUseTemplateVars.mockReturnValue({
      hasVariables: true,
      variables: ["name"],
      values: { name: "" },
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={mockOnOpenChange} open={true} />);

    const cancelButton = screen.getByRole("button", { name: "取消" });
    await userEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes dialog when user clicks close button", async () => {
    const mockOnOpenChange = vi.fn();

    mockUseTemplateVars.mockReturnValue({
      hasVariables: false,
      variables: [],
      values: {},
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={mockOnOpenChange} open={true} />);

    const closeButton = screen.getByRole("button", { name: "关闭" });
    await userEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render when open is false", () => {
    mockUseTemplateVars.mockReturnValue({
      hasVariables: true,
      variables: ["name"],
      values: {},
      setValue: mockSetValue,
      applyAll: mockApplyAll,
    });

    render(<VariableForm onOpenChange={vi.fn()} open={false} />);

    expect(screen.queryByLabelText("name")).not.toBeInTheDocument();
  });
});
