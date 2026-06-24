// src/features/ribbon/components/__tests__/ColorPicker.test.tsx — ColorPicker 测试 / ColorPicker tests
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ColorPicker } from "../ColorPicker";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

describe("ColorPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染触发按钮并带 aria-label", () => {
    render(
      <ColorPicker label="字体颜色" onChange={vi.fn()} testId="text-color" />,
    );
    expect(screen.getByTestId("text-color")).toBeInTheDocument();
    expect(screen.getByLabelText("字体颜色")).toBeInTheDocument();
  });

  it("初始状态色板不可见", () => {
    render(<ColorPicker label="颜色" onChange={vi.fn()} />);
    expect(screen.queryByTestId("color-swatch")).not.toBeInTheDocument();
  });

  it("点击触发按钮展开色板", async () => {
    const user = userEvent.setup();
    render(<ColorPicker label="颜色" onChange={vi.fn()} />);
    await user.click(screen.getByLabelText("颜色"));
    // 10 个预设色板
    expect(screen.getAllByTestId("color-swatch")).toHaveLength(10);
  });

  it("点击色板调用 onChange 并关闭色板", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker label="颜色" onChange={onChange} />);
    await user.click(screen.getByLabelText("颜色"));
    await user.click(screen.getByLabelText("color.red"));
    expect(onChange).toHaveBeenCalledWith("#FF0000");
  });

  it("色板下方有「更多颜色」按钮", async () => {
    const user = userEvent.setup();
    render(<ColorPicker label="颜色" onChange={vi.fn()} />);
    await user.click(screen.getByLabelText("颜色"));
    expect(screen.getByText("format.moreColors")).toBeInTheDocument();
  });

  it("点击「更多颜色」展开原生 color input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker label="颜色" onChange={onChange} />);
    await user.click(screen.getByLabelText("颜色"));
    await user.click(screen.getByText("format.moreColors"));
    const colorInput = screen.getByTestId("color-native-input");
    expect(colorInput).toHaveAttribute("type", "color");
  });

  it("当前选中色高亮(aria-pressed)", async () => {
    const user = userEvent.setup();
    render(<ColorPicker label="颜色" onChange={vi.fn()} value="#FF0000" />);
    await user.click(screen.getByLabelText("颜色"));
    const redSwatch = screen.getByLabelText("color.red");
    expect(redSwatch).toHaveAttribute("aria-pressed", "true");
  });

  it("未选中的色板 aria-pressed 为 false", async () => {
    const user = userEvent.setup();
    render(<ColorPicker label="颜色" onChange={vi.fn()} value="#FF0000" />);
    await user.click(screen.getByLabelText("颜色"));
    const blueSwatch = screen.getByLabelText("color.blue");
    expect(blueSwatch).toHaveAttribute("aria-pressed", "false");
  });
});
