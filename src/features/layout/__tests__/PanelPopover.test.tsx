import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PanelPopover } from "../components/PanelPopover";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

const TRANSFORM_RE = /transition-transform/;
const DURATION_200_RE = /duration-200/;
describe("PanelPopover", () => {
  it("open=false 时不渲染内容", () => {
    const { container } = render(
      <PanelPopover onClose={vi.fn()} open={false} side="left" width={220}>
        <div>大纲内容</div>
      </PanelPopover>
    );
    expect(container.querySelector("[data-testid='panel-popover']")).toBeNull();
  });

  it("open=true 时渲染内容", () => {
    render(
      <PanelPopover onClose={vi.fn()} open={true} side="left" width={220}>
        <div>大纲内容</div>
      </PanelPopover>
    );
    expect(screen.getByTestId("panel-popover")).toBeInTheDocument();
    expect(screen.getByText("大纲内容")).toBeInTheDocument();
  });

  it("点击遮罩层触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <PanelPopover onClose={onClose} open={true} side="right" width={380}>
        <div>Agent 内容</div>
      </PanelPopover>
    );
    fireEvent.pointerDown(screen.getByTestId("panel-popover-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  // 6.4 浮窗滑入动画
  it("6.4 左侧浮窗含滑入动画类", () => {
    render(
      <PanelPopover onClose={vi.fn()} open={true} side="left" width={220}>
        <div>大纲</div>
      </PanelPopover>
    );
    const popover = screen.getByTestId("panel-popover");
    expect(popover.className).toMatch(TRANSFORM_RE);
    expect(popover.className).toMatch(DURATION_200_RE);
  });

  // 6.6 Escape 关闭
  it("6.6 按 Escape 触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <PanelPopover onClose={onClose} open={true} side="left" width={220}>
        <div>大纲</div>
      </PanelPopover>
    );
    fireEvent.keyDown(screen.getByTestId("panel-popover"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
