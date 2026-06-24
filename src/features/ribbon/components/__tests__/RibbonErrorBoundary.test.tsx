// src/features/ribbon/components/__tests__/RibbonErrorBoundary.test.tsx — 错误边界测试 / Error boundary tests
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RibbonErrorBoundary } from "../RibbonErrorBoundary";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));
const errorSpy = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: { error: (...args: unknown[]) => errorSpy(args) },
}));

/** 会抛错的子组件 / Throwing child */
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("boom");
  }
  return <div data-testid="child">ok</div>;
}

describe("RibbonErrorBoundary", () => {
  it("正常渲染子组件", () => {
    render(
      <RibbonErrorBoundary tabId="home">
        <ThrowingChild shouldThrow={false} />
      </RibbonErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("子组件崩溃时显示 fallback UI", () => {
    // 抑制 console.error（React 测试会打印错误堆栈）
    const spy = vi.spyOn(console, "error").mockImplementation(() => null);
    render(
      <RibbonErrorBoundary tabId="home">
        <ThrowingChild shouldThrow />
      </RibbonErrorBoundary>
    );
    expect(screen.getByText("ribbon.error.title")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(screen.getByText("ribbon.error.retry")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
