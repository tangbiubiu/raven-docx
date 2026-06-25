// src/features/formatting/__tests__/format-apply.test.ts — format-apply 委派测试
// 验证 format-apply.ts 是薄委派层:applyFont → execSetFontFamily / execSetFontFamilyEastAsia 等。
// CJK 字体路由到 execSetFontFamilyEastAsia,latin 字体路由到 execSetFontFamily。
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mock commands 模块,验证 format-apply 委派到 exec* ---
const mockExec = vi.hoisted(() => ({
  execSetFontFamily: vi.fn(),
  execSetFontFamilyEastAsia: vi.fn(),
  execSetFontSize: vi.fn(),
  execSetTextColor: vi.fn(),
  execSetHighlight: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockExec);

// --- mock store:format-apply 内部仍读 editorBridge,确保不短路 ---
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: {
    getState: () => ({ editorBridge: { getEditorView: () => ({}) } }),
  },
}));

import {
  applyFont,
  applyFontSize,
  applyHighlight,
  applyTextColor,
} from "@/features/formatting/format-apply";

describe("format-apply — 委派到 exec* 命令", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyFont — latin 字体路由", () => {
    it('value="calibri" → execSetFontFamily("Calibri")', () => {
      applyFont("calibri");
      expect(mockExec.execSetFontFamily).toHaveBeenCalledWith("Calibri");
      expect(mockExec.execSetFontFamilyEastAsia).not.toHaveBeenCalled();
    });

    it('value="georgia" → execSetFontFamily("Georgia")', () => {
      applyFont("georgia");
      expect(mockExec.execSetFontFamily).toHaveBeenCalledWith("Georgia");
      expect(mockExec.execSetFontFamilyEastAsia).not.toHaveBeenCalled();
    });

    it('value="default"(空字体) → 不调用任何命令', () => {
      applyFont("default");
      expect(mockExec.execSetFontFamily).not.toHaveBeenCalled();
      expect(mockExec.execSetFontFamilyEastAsia).not.toHaveBeenCalled();
    });

    it("未知 value → 不调用", () => {
      applyFont("nonexistent");
      expect(mockExec.execSetFontFamily).not.toHaveBeenCalled();
      expect(mockExec.execSetFontFamilyEastAsia).not.toHaveBeenCalled();
    });
  });

  describe("applyFont — CJK 字体路由", () => {
    it('value="simsun" → execSetFontFamilyEastAsia("SimSun")', () => {
      applyFont("simsun");
      expect(mockExec.execSetFontFamilyEastAsia).toHaveBeenCalledWith("SimSun");
      expect(mockExec.execSetFontFamily).not.toHaveBeenCalled();
    });

    it('value="simhei" → execSetFontFamilyEastAsia("SimHei")', () => {
      applyFont("simhei");
      expect(mockExec.execSetFontFamilyEastAsia).toHaveBeenCalledWith("SimHei");
      expect(mockExec.execSetFontFamily).not.toHaveBeenCalled();
    });

    it('value="msyh" → execSetFontFamilyEastAsia("Microsoft YaHei")', () => {
      applyFont("msyh");
      expect(mockExec.execSetFontFamilyEastAsia).toHaveBeenCalledWith(
        "Microsoft YaHei"
      );
    });

    it('value="pingfang" → execSetFontFamilyEastAsia("PingFang SC")', () => {
      applyFont("pingfang");
      expect(mockExec.execSetFontFamilyEastAsia).toHaveBeenCalledWith(
        "PingFang SC"
      );
    });

    it('value="noto-sans-sc" → execSetFontFamilyEastAsia("Noto Sans SC")', () => {
      applyFont("noto-sans-sc");
      expect(mockExec.execSetFontFamilyEastAsia).toHaveBeenCalledWith(
        "Noto Sans SC"
      );
    });
  });

  describe("applyFontSize", () => {
    it("传递 half-points 值", () => {
      applyFontSize(24);
      expect(mockExec.execSetFontSize).toHaveBeenCalledWith(24);
    });
  });

  describe("applyTextColor", () => {
    it("透传带 # 前缀的颜色(剥离在 exec 层)", () => {
      applyTextColor("#FF0000");
      expect(mockExec.execSetTextColor).toHaveBeenCalledWith("#FF0000");
    });

    it("透传无 # 前缀的颜色", () => {
      applyTextColor("00FF00");
      expect(mockExec.execSetTextColor).toHaveBeenCalledWith("00FF00");
    });
  });

  describe("applyHighlight", () => {
    it("传递颜色名", () => {
      applyHighlight("yellow");
      expect(mockExec.execSetHighlight).toHaveBeenCalledWith("yellow");
    });
  });
});
