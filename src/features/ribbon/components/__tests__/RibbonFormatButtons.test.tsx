// src/features/ribbon/components/__tests__/RibbonFormatButtons.test.tsx — 字体回显映射测试 / Font echo mapping tests
// 验证 useFontFamilyValue 从 selectionFormat.fontFamily 对象提取显示字符串。
// 回显策略:混合(null)→ "",无 mark({})→ "",eastAsia 优先于 ascii。
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
  useDocumentStore: vi.fn((selector?: (s: typeof mockDocState) => unknown) =>
    typeof selector === "function" ? selector(mockDocState) : mockDocState
  ),
}));

describe("useFontFamilyValue — 对象回显策略", () => {
  beforeEach(() => {
    mockDocState.selectionFormat = null;
  });

  it("selectionFormat 为 null 时回显空", () => {
    mockDocState.selectionFormat = null;
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("");
  });

  it("fontFamily 为 null(混合选区)时回显空", () => {
    mockDocState.selectionFormat = { fontFamily: null };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("");
  });

  it("fontFamily 为空对象(无 mark)时回显空", () => {
    mockDocState.selectionFormat = { fontFamily: {} };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("");
  });

  it("fontFamily 仅含 ascii 时回显 ascii 值", () => {
    mockDocState.selectionFormat = { fontFamily: { ascii: "Calibri" } };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("Calibri");
  });

  it("fontFamily 仅含 eastAsia(CJK)时回显友好名", () => {
    mockDocState.selectionFormat = { fontFamily: { eastAsia: "SimSun" } };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("宋体");
  });

  it("fontFamily 同时含 ascii 和 eastAsia 时回显 eastAsia 友好名(中文优先)", () => {
    mockDocState.selectionFormat = {
      fontFamily: { ascii: "Calibri", eastAsia: "SimSun" },
    };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("宋体");
  });

  it("三字段同设 CJK 字体时回显友好名", () => {
    mockDocState.selectionFormat = {
      fontFamily: { ascii: "SimHei", hAnsi: "SimHei", eastAsia: "SimHei" },
    };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("黑体");
  });

  it("fontFamily 含非清单字体名时回显实际字体名", () => {
    mockDocState.selectionFormat = {
      fontFamily: { ascii: "Comic Sans MS" },
    };
    const { result } = renderHook(() => useFontFamilyValue());
    expect(result.current).toBe("Comic Sans MS");
  });
});
