// src/features/formatting/__tests__/format-apply.test.ts — format-apply 委派测试
// 验证 format-apply.ts 是薄委派层:applyFont → execSetFontFamily 等。
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mock commands 模块,验证 format-apply 委派到 exec* ---
const mockExec = vi.hoisted(() => ({
  execSetFontFamily: vi.fn(),
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

  describe("applyFont", () => {
    it('value="calibri" → execSetFontFamily("Calibri")', () => {
      applyFont("calibri");
      expect(mockExec.execSetFontFamily).toHaveBeenCalledWith("Calibri");
    });

    it('value="georgia" → execSetFontFamily("Georgia")', () => {
      applyFont("georgia");
      expect(mockExec.execSetFontFamily).toHaveBeenCalledWith("Georgia");
    });

    it('value="default"(空字体) → 不调用 execSetFontFamily', () => {
      applyFont("default");
      expect(mockExec.execSetFontFamily).not.toHaveBeenCalled();
    });

    it("未知 value → 不调用", () => {
      applyFont("nonexistent");
      expect(mockExec.execSetFontFamily).not.toHaveBeenCalled();
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
