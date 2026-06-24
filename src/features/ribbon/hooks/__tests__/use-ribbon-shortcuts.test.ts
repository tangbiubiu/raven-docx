// src/features/ribbon/hooks/__tests__/use-ribbon-shortcuts.test.ts — Ribbon 快捷键 hook 测试 / Ribbon shortcuts tests
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExec = vi.hoisted(() => ({
  clearFormatting: vi.fn(),
  execIndent: vi.fn(),
  execOutdent: vi.fn(),
  execWrapIn: vi.fn(),
  execLift: vi.fn(),
}));

vi.mock("@/features/formatting/format-apply", () => ({
  clearFormatting: mockExec.clearFormatting,
}));
vi.mock("@/features/editor/commands", () => ({
  execIndent: mockExec.execIndent,
  execOutdent: mockExec.execOutdent,
  execWrapIn: mockExec.execWrapIn,
  execLift: mockExec.execLift,
}));

import { useRibbonShortcuts } from "../use-ribbon-shortcuts";

function fireKey(opts: {
  key: string;
  code?: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
}) {
  const event = new KeyboardEvent("keydown", {
    key: opts.key,
    code: opts.code ?? opts.key,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

describe("useRibbonShortcuts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Cmd+\\ 触发清除格式", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "\\", code: "Backslash", meta: true }));
    expect(mockExec.clearFormatting).toHaveBeenCalledOnce();
  });

  it("Cmd+] 触发增加缩进", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "]", code: "BracketRight", meta: true }));
    expect(mockExec.execIndent).toHaveBeenCalledOnce();
  });

  it("Cmd+[ 触发减少缩进", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "[", code: "BracketLeft", meta: true }));
    expect(mockExec.execOutdent).toHaveBeenCalledOnce();
  });

  it("Ctrl 等价 Cmd(跨平台)", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "\\", code: "Backslash", ctrl: true }));
    expect(mockExec.clearFormatting).toHaveBeenCalledOnce();
  });

  it("无修饰键不触发", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "\\", code: "Backslash" }));
    expect(mockExec.clearFormatting).not.toHaveBeenCalled();
  });

  it("Cmd+Shift+7(Digit7) 触发有序列表", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "&", code: "Digit7", meta: true, shift: true }));
    expect(mockExec.execWrapIn).toHaveBeenCalledWith("ordered_list");
  });

  it("Cmd+Shift+8(Digit8) 触发无序列表", () => {
    renderHook(() => useRibbonShortcuts());
    act(() => fireKey({ key: "*", code: "Digit8", meta: true, shift: true }));
    expect(mockExec.execWrapIn).toHaveBeenCalledWith("bullet_list");
  });

  it("卸载后移除监听", () => {
    const { unmount } = renderHook(() => useRibbonShortcuts());
    unmount();
    act(() => fireKey({ key: "\\", code: "Backslash", meta: true }));
    expect(mockExec.clearFormatting).not.toHaveBeenCalled();
  });
});
