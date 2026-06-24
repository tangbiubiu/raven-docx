// src/features/ribbon/components/__tests__/RibbonFormatButtons.test.tsx — 字体回显映射测试 / Font echo mapping tests
// 验证 useFontFamilyValue 将 mark ascii 原始值反向映射到 FONT_FAMILIES.value。
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFontFamilyValue } from "../RibbonFormatButtons";

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ t: (key: string) => key }),
}));

// 可控的 selectionFormat 状态
const mockDocState = {
  selectionFormat: null as Record<string, unknown> | null,
};

vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn(
    (selector?: (s: typeof mockDocState) => unknown) =>
      typeof selector === "function" ? selector(mockDocState) : mockDocState,
  ),
}));

describe("useFontFamilyValue — ascii→value 反向映射", () => {
  beforeEach(() => {
    mockDocState.selectionFormat = null;
  });

  it("ascii 为空时回显 default", () => {
    mockDocState.selectionFormat = { fontFamily: "" };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("default");
  });

  it("selectionFormat 为 null 时回显 default", () => {
    mockDocState.selectionFormat = null;
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("default");
  });

  it("ascii 为 Calibri 时回显 calibri", () => {
    mockDocState.selectionFormat = { fontFamily: "Calibri" };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("calibri");
  });

  it("ascii 为 Arial 时回显 arial", () => {
    mockDocState.selectionFormat = { fontFamily: "Arial" };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("arial");
  });

  it("ascii 为 Times New Roman 时回显 times", () => {
    mockDocState.selectionFormat = { fontFamily: "Times New Roman" };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("times");
  });

  it("大小写不敏感:ascii 为 calibri(小写)仍回显 calibri", () => {
    mockDocState.selectionFormat = { fontFamily: "calibri" };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("calibri");
  });

  it("未知字体(不在 FONT_FAMILIES 中)回显空字符串", () => {
    mockDocState.selectionFormat = { fontFamily: "Comic Sans MS" };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("");
  });
});
