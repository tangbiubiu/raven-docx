import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollapsedPanelTrigger } from "../components/CollapsedPanelTrigger";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));

describe("CollapsedPanelTrigger", () => {
  it("渲染按钮(aria-label 来自 labelKey)", () => {
    render(
      <CollapsedPanelTrigger
        labelKey="panel.expand.outline"
        onClick={vi.fn()}
        side="left"
      />
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "panel.expand.outline");
  });

  it("点击触发 onClick", () => {
    const onClick = vi.fn();
    render(
      <CollapsedPanelTrigger
        labelKey="panel.expand.outline"
        onClick={onClick}
        side="left"
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // 6.5 使用 lucide 图标替代旋转文字:不再含 writingMode 样式
  it("6.5 不使用旋转文字(writingMode)", () => {
    const { container } = render(
      <CollapsedPanelTrigger
        labelKey="panel.expand.outline"
        onClick={vi.fn()}
        side="left"
      />
    );
    const styledSpan = container.querySelector('[style*="writing-mode"]');
    expect(styledSpan).toBeNull();
  });

  it("6.5 渲染 svg 图标(lucide)", () => {
    const { container } = render(
      <CollapsedPanelTrigger
        labelKey="panel.expand.outline"
        onClick={vi.fn()}
        side="left"
      />
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
