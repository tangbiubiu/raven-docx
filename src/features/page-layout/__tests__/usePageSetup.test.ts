// features/page-layout/__tests__/usePageSetup.test.ts — 页面设置 Hook 测试
// 测试读取和设置页面布局属性

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageSetup } from "../hooks/usePageSetup";
import { PAPER_PRESETS } from "../types";
// vi.mock 被 hoisted，闭包变量需通过 vi.hoisted 声明
const { mockGetLayout, mockGetAgent } = vi.hoisted(() => ({
  mockGetLayout: vi.fn(),
  mockGetAgent: vi.fn(),
}));

let _editorBridge: unknown = null;

// Mock useDocumentStore — 提供 getState 供 usePageSetup 模块级函数 readCurrentLayout 使用
vi.mock("@/stores/useDocumentStore", () => {
  const mockStore = vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      editorBridge: _editorBridge,
    };
    return selector ? selector(state) : state;
  });
  (mockStore as unknown as Record<string, unknown>).getState = () => ({
  });
  return { useDocumentStore: mockStore };
});

function setBridge(layout: unknown, agent: unknown = null) {
  _editorBridge = {
    getLayout: () => layout,
    getAgent: () => agent,
  };
}

describe("usePageSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _editorBridge = null;
    mockGetLayout.mockReset();
    mockGetAgent.mockReset();
  });

  describe("当 EditorBridge 未就绪时", () => {
    it("hasEditor 为 false", () => {
      _editorBridge = null;
      const { result } = renderHook(() => usePageSetup());
      expect(result.current.hasEditor).toBe(false);
    });

    it("getCurrentLayout 返回默认 A4 纵向布局", () => {
      _editorBridge = null;
      const { result } = renderHook(() => usePageSetup());
      const layout = result.current.getCurrentLayout();
      expect(layout.orientation).toBe("portrait");
      expect(layout.margins.top).toBeGreaterThan(0);
      expect(layout.paperSize.width).toBeGreaterThan(0);
    });
  });

  describe("getLayout API 可用时", () => {
    it("从 getLayout 读取页边距", () => {
      setBridge({
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      const margins = result.current.getMargins();
      expect(margins.top).toBe(1440);
      expect(margins.left).toBe(1440);
    });

    it("getMarginPresetName 识别 normal", () => {
      setBridge({
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      expect(result.current.getMarginPresetName()).toBe("normal");
    });

    it("从 getLayout 读取页面大小和方向", () => {
      setBridge({
        getPageSize: () => ({ width: 11_906, height: 16_838 }),
        getOrientation: () => "portrait",
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      const size = result.current.getPageSize();
      expect(size.width).toBe(PAPER_PRESETS.A4.width);
      expect(size.height).toBe(PAPER_PRESETS.A4.height);
    });

    it("getPaperPresetName 识别 A4", () => {
      setBridge({
        getPageSize: () => ({ width: 11_906, height: 16_838 }),
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      expect(result.current.getPaperPresetName()).toBe("A4");
    });

    it("setMargins 通过 getLayout().setMargins 设置边距", () => {
      const setMarginsMock = vi.fn();
      setBridge({
        setMargins: setMarginsMock,
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      const success = result.current.setMargins({
        top: 720,
        right: 720,
        bottom: 720,
        left: 720,
      });
      expect(success).toBe(true);
      expect(setMarginsMock).toHaveBeenCalledWith({
        top: 720,
        right: 720,
        bottom: 720,
        left: 720,
      });
    });

    it("setOrientation 通过 getLayout().setOrientation 设置方向", () => {
      const setOrientationMock = vi.fn();
      setBridge({
        setOrientation: setOrientationMock,
        getPageSize: () => ({ width: 11_906, height: 16_838 }),
        getOrientation: () => "portrait",
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      const success = result.current.setOrientation("landscape");
      expect(success).toBe(true);
      expect(setOrientationMock).toHaveBeenCalledWith("landscape");
    });

    it("applyMarginPreset 使用预设设置边距", () => {
      const setMarginsMock = vi.fn();
      setBridge({
        setMargins: setMarginsMock,
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      const success = result.current.applyMarginPreset("narrow");
      expect(success).toBe(true);
      expect(setMarginsMock).toHaveBeenCalled();
    });

    it("applyMarginPreset 对 custom 预设返回 false", () => {
      setBridge({
        getMargins: () => ({
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        }),
      });
      const { result } = renderHook(() => usePageSetup());
      expect(result.current.applyMarginPreset("custom")).toBe(false);
    });
  });

  describe("getLayout 不可用但 agent 可用时", () => {
    it("setMargins 回退到 DocumentAgent", () => {
      _editorBridge = {
        getLayout: () => null,
        getAgent: () => ({
          executeCommands: vi.fn(),
        }),
      };
      const { result } = renderHook(() => usePageSetup());
      const success = result.current.setMargins({
        top: 720,
        right: 720,
        bottom: 720,
        left: 720,
      });
      expect(success).toBe(true);
    });

    it("setPageSize 回退到 DocumentAgent", () => {
      _editorBridge = {
        getLayout: () => null,
        getAgent: () => ({
          executeCommands: vi.fn(),
        }),
      };
      const { result } = renderHook(() => usePageSetup());
      const success = result.current.setPageSize({
        width: 11_906,
        height: 16_838,
      });
      expect(success).toBe(true);
    });
  });
});
