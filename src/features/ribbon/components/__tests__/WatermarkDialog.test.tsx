// src/features/ribbon/components/__tests__/WatermarkDialog.test.tsx — 水印对话框测试
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WatermarkDialog } from "../WatermarkDialog";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

const mockCmds = vi.hoisted(() => ({
  execSetWatermark: vi.fn(),
  execGetWatermark: vi.fn<
    () => {
      kind: string;
      text: string;
      font: string;
      color: string;
      semitransparent: boolean;
      layout: string;
      fontSize?: number;
    } | null
  >(() => null),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

// 同 LayoutTab 测试:mock Select 为原生 <select>
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="select-root"
      onChange={(e) => onValueChange?.(e.target.value)}
      value={value ?? ""}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

describe("WatermarkDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染文本/字体/颜色/版式/字号字段", () => {
    render(<WatermarkDialog onClose={vi.fn()} />);
    expect(screen.getByTestId("watermark-text-input")).toBeInTheDocument();
    expect(screen.getByTestId("watermark-font-input")).toBeInTheDocument();
    expect(screen.getByTestId("watermark-color-input")).toBeInTheDocument();
    expect(
      screen.getByTestId("watermark-semitransparent-input")
    ).toBeInTheDocument();
  });

  it("输入文字后点确定调用 execSetWatermark", () => {
    render(<WatermarkDialog onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("watermark-text-input"), {
      target: { value: "机密" },
    });
    fireEvent.click(screen.getByTestId("watermark-apply"));
    expect(mockCmds.execSetWatermark).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "text",
        text: "机密",
        layout: "diagonal",
        semitransparent: true,
      })
    );
  });

  it("点清除水印调用 execSetWatermark(null)", () => {
    render(<WatermarkDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("watermark.clear"));
    expect(mockCmds.execSetWatermark).toHaveBeenCalledWith(null);
  });

  it("打开时从 execGetWatermark 预填", () => {
    mockCmds.execGetWatermark.mockReturnValue({
      kind: "text",
      text: "DRAFT",
      font: "Calibri",
      color: "#FF0000",
      semitransparent: false,
      layout: "horizontal",
      fontSize: 36,
    });
    render(<WatermarkDialog onClose={vi.fn()} />);
    const input = screen.getByTestId(
      "watermark-text-input"
    ) as HTMLInputElement;
    expect(input.value).toBe("DRAFT");
  });
});
