import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PanelResizeHandle } from "../components/PanelResizeHandle";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

const WIDTH_PX_RE = /w-px/;
const BG_BORDER_RE = /bg-border/;
const HOVER_W_RE = /hover:w-1\.5/;
const DURATION_150_RE = /duration-150/;
describe("PanelResizeHandle", () => {
  const baseProps = {
    side: "left" as const,
    currentWidth: 220,
    onResize: vi.fn(),
    onReset: vi.fn(),
    labelKey: "panel.resize.outline",
  };

  it("渲染带正确 aria-label 的手柄", () => {
    render(<PanelResizeHandle {...baseProps} />);
    const handle = screen.getByRole("separator");
    expect(handle).toHaveAttribute("aria-label", "panel.resize.outline");
  });

  // 6.1 拖拽 handle 视觉:默认窄(1px 量级),hover 加宽
  it("6.1 默认视觉为细窄手柄(w-px 量级)", () => {
    render(<PanelResizeHandle {...baseProps} />);
    const handle = screen.getByRole("separator");
    expect(handle.className).toMatch(WIDTH_PX_RE);
    expect(handle.className).toMatch(BG_BORDER_RE);
  });

  it("6.1 hover 态加宽(w-1.5)", () => {
    render(<PanelResizeHandle {...baseProps} />);
    const handle = screen.getByRole("separator");
    expect(handle.className).toMatch(HOVER_W_RE);
  });

  it("6.1 包含 transition 时长 150ms", () => {
    render(<PanelResizeHandle {...baseProps} />);
    const handle = screen.getByRole("separator");
    // transition-[width,background-color] 或类似,含 duration-150
    expect(handle.className).toMatch(DURATION_150_RE);
  });

  // 6.2 拖拽时显示实时宽度 tooltip
  it("6.2 未拖拽时不显示宽度提示", () => {
    render(<PanelResizeHandle {...baseProps} />);
    expect(screen.queryByText("220px")).toBeNull();
  });

  // 6.3 双击恢复默认宽度
  it("6.3 双击触发 onReset", () => {
    const onReset = vi.fn();
    render(<PanelResizeHandle {...baseProps} onReset={onReset} />);
    const handle = screen.getByRole("separator");
    fireEvent.doubleClick(handle);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
