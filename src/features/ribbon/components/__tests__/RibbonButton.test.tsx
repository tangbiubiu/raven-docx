// src/features/ribbon/components/__tests__/RibbonButton.test.tsx — RibbonButton 测试 / RibbonButton tests
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

// radix Tooltip 在 jsdom 下需要 PointerEvent；mock 为静态渲染
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

import { RibbonButton } from "../RibbonButton";

describe("RibbonButton", () => {
  it("渲染 children 与 aria-label", () => {
    render(
      <RibbonButton label="加粗" testId="btn">
        <span>B</span>
      </RibbonButton>
    );
    const btn = screen.getByTestId("btn");
    expect(btn).toHaveAttribute("aria-label", "加粗");
    expect(btn).toHaveTextContent("B");
  });

  it("hover/active 动效类存在", () => {
    render(
      <RibbonButton label="x" testId="btn">
        x
      </RibbonButton>
    );
    const btn = screen.getByTestId("btn");
    // active 缩放
    expect(btn.className).toContain("active:scale-95");
    // hover 背景与缩放
    expect(btn.className).toContain("hover:bg-accent");
    expect(btn.className).toContain("hover:scale-105");
    // transition 150ms
    expect(btn.className).toContain("transition");
    expect(btn.className).toContain("duration-150");
  });

  it("disabled 时不可点击", () => {
    const onClick = vi.fn();
    render(
      <RibbonButton disabled label="x" onClick={onClick} testId="btn">
        x
      </RibbonButton>
    );
    fireEvent.click(screen.getByTestId("btn"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
