// src/features/ribbon/hooks/__tests__/use-media-query.test.ts — useMediaQuery 测试 / useMediaQuery tests
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "../use-media-query";

describe("useMediaQuery", () => {
  let listener: ((e: MediaQueryListEvent) => void) | null = null;
  let currentMatches = false;

  beforeEach(() => {
    currentMatches = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: currentMatches,
        media: query,
        onchange: null,
        addEventListener: (
          _type: string,
          cb: (e: MediaQueryListEvent) => void
        ) => {
          listener = cb;
        },
        removeEventListener: () => {
          listener = null;
        },
        addListener: () => {
          // deprecated API, no-op
        },
        removeListener: () => {
          // deprecated API, no-op
        },
        dispatchEvent: () => false,
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    listener = null;
  });

  it("初始返回 matchMedia 的 matches 值", () => {
    currentMatches = true;
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("响应 matchMedia 变化", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => {
      listener?.({
        matches: true,
        media: "(min-width: 768px)",
      } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });

  it("卸载后移除监听", () => {
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();
    expect(listener).toBeNull();
  });
});
