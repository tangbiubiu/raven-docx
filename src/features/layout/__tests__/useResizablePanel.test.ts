import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResizablePanel } from "../hooks/useResizablePanel";

describe("useResizablePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("返回 onPointerDown 函数", () => {
    const { result } = renderHook(() =>
      useResizablePanel({
        side: "right",
        currentWidth: 380,
        onResize: vi.fn(),
      })
    );
    expect(typeof result.current.onPointerDown).toBe("function");
  });

  it("向左拖拽右栏时宽度增加", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizablePanel({
        side: "right",
        currentWidth: 380,
        onResize,
      })
    );

    result.current.onPointerDown({
      clientX: 1000,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent);

    const moveEvent = new PointerEvent("pointermove", { clientX: 950 });
    window.dispatchEvent(moveEvent);

    // 右栏:宽度 = currentWidth - (clientX - startX) = 380 - (950 - 1000) = 430
    expect(onResize).toHaveBeenCalledWith(430);
  });

  it("向右拖拽左栏时宽度增加", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizablePanel({
        side: "left",
        currentWidth: 220,
        onResize,
      })
    );

    result.current.onPointerDown({
      clientX: 200,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent);

    const moveEvent = new PointerEvent("pointermove", { clientX: 250 });
    window.dispatchEvent(moveEvent);

    // 左栏:宽度 = currentWidth + (clientX - startX) = 220 + (250 - 200) = 270
    expect(onResize).toHaveBeenCalledWith(270);
  });

  it("拖拽结束时移除全局监听", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizablePanel({
        side: "left",
        currentWidth: 220,
        onResize,
      })
    );

    result.current.onPointerDown({
      clientX: 200,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent);

    const upEvent = new PointerEvent("pointerup");
    const spy = vi.spyOn(window, "removeEventListener");
    window.dispatchEvent(upEvent);

    expect(spy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("pointerup", expect.any(Function));
  });
});
