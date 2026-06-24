// src/features/ribbon/components/__tests__/RibbonToggleButton.test.tsx — RibbonToggleButton 测试 / RibbonToggleButton tests
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));
vi.mock("@/components/ui/toggle", () => ({
  Toggle: ({
    children,
    pressed,
    onPressedChange,
    "aria-label": ariaLabel,
    className,
    ...rest
  }: {
    children?: React.ReactNode;
    pressed: boolean;
    onPressedChange: () => void;
    "aria-label"?: string;
    className?: string;
    [k: string]: unknown;
  }) => (
    <button
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className={className}
      data-pressed={pressed}
      onClick={onPressedChange}
      type="button"
      {...rest}
    >
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { RibbonToggleButton } from "../RibbonToggleButton";

describe("RibbonToggleButton", () => {
  it("渲染 children 并反映 pressed 态", () => {
    render(
      <RibbonToggleButton
        label="加粗"
        onPressedChange={vi.fn()}
        pressed
        testId="btn"
      >
        <span>B</span>
      </RibbonToggleButton>
    );
    const btn = screen.getByTestId("btn");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveTextContent("B");
  });

  it("hover/active 动效类存在", () => {
    render(
      <RibbonToggleButton
        label="x"
        onPressedChange={vi.fn()}
        pressed={false}
        testId="btn"
      >
        x
      </RibbonToggleButton>
    );
    const btn = screen.getByTestId("btn");
    expect(btn.className).toContain("active:scale-95");
    expect(btn.className).toContain("hover:scale-105");
    expect(btn.className).toContain("transition");
    expect(btn.className).toContain("duration-150");
  });

  it("pressed 时有视觉强调(data-pressed)", () => {
    render(
      <RibbonToggleButton
        label="x"
        onPressedChange={vi.fn()}
        pressed
        testId="btn"
      >
        x
      </RibbonToggleButton>
    );
    expect(screen.getByTestId("btn")).toHaveAttribute("data-pressed", "true");
  });

  it("onPressedChange 触发", () => {
    const onChg = vi.fn();
    render(
      <RibbonToggleButton
        label="x"
        onPressedChange={onChg}
        pressed={false}
        testId="btn"
      >
        x
      </RibbonToggleButton>
    );
    fireEvent.click(screen.getByTestId("btn"));
    expect(onChg).toHaveBeenCalledOnce();
  });
});
