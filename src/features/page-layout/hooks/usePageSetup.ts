// features/page-layout/hooks/usePageSetup.ts — 页面设置 Hook (Page Setup Hook)
// 读写文档的 SectionProperties（页边距、纸张大小、方向）
// Reference: .dev/plan/phase4-branch-plan.md §2.2 · FRS F-100~102
//
// 优先使用 EditorBridge.getLayout() API。
// 若未实现，回退到通过 DocumentAgent 设置 SectionProperties。

import { useCallback, useMemo } from "react";
import { useDocumentStore } from "@/stores/useDocumentStore";
import {
  identifyMarginPreset,
  identifyPaperPreset,
  MARGIN_PRESETS,
  type Margins,
  type Orientation,
  PAPER_PRESETS,
  type PageLayoutState,
  type PaperSize,
} from "../types";

/**
 * Layout API 的最小类型契约。
 * 对应 docx-editor 的 getLayout() 返回值。
 */
type LayoutAPI = {
  getMargins?: () => {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  setMargins?: (m: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }) => void;
  getPageSize?: () => { width: number; height: number };
  setPageSize?: (w: number, h: number) => void;
  setOrientation?: (orientation: "portrait" | "landscape") => void;
  getOrientation?: () => "portrait" | "landscape";
};

/** DocumentAgent 的最小契约（用于 SectionProperties 操作） */
type DocumentAgent = {
  executeCommands?: (
    cmds: Array<{ type: string; [key: string]: unknown }>
  ) => unknown;
};

/** 从 Layout API 或文档中读取当前页面布局状态 */
function readCurrentLayout(): PageLayoutState | null {
  const store = useDocumentStore.getState();
  const bridge = store.editorBridge;
  if (!bridge) {
    return null;
  }

  // 1. 尝试 getLayout() API
  const layout = bridge.getLayout() as LayoutAPI | null;
  if (layout) {
    const margins = layout.getMargins?.();
    const pageSize = layout.getPageSize?.();
    const orientation = layout.getOrientation?.();
    if (margins && pageSize) {
      return {
        margins: {
          top: margins.top,
          right: margins.right,
          bottom: margins.bottom,
          left: margins.left,
        },
        paperSize: { width: pageSize.width, height: pageSize.height },
        orientation:
          orientation ??
          (pageSize.width > pageSize.height ? "landscape" : "portrait"),
        headerFooter: {
          header: { left: "", center: "", right: "" },
          footer: { left: "", center: "", right: "" },
          differentFirstPage: false,
          differentOddEven: false,
        },
      };
    }
  }

  // 2. 回退：返回默认的 A4 纵向布局
  return null;
}

/** 把调整后的宽高应用到正确的纸张预设大小上 */
function applyOrientationToPaperSize(
  paperSize: PaperSize,
  orientation: Orientation
): PaperSize {
  if (orientation === "landscape") {
    if (paperSize.width < paperSize.height) {
      return { width: paperSize.height, height: paperSize.width };
    }
  } else if (paperSize.width > paperSize.height) {
    return { width: paperSize.height, height: paperSize.width };
  }
  return paperSize;
}

const DEFAULT_LAYOUT: PageLayoutState = {
  margins: MARGIN_PRESETS.normal,
  paperSize: PAPER_PRESETS.A4,
  orientation: "portrait",
  headerFooter: {
    header: { left: "", center: "", right: "" },
    footer: { left: "", center: "", right: "" },
    differentFirstPage: false,
    differentOddEven: false,
  },
};

/**
 * usePageSetup — 页面设置 Hook。
 *
 * 提供读写 SectionProperties 的能力。
 * 优先使用 EditorBridge.getLayout()，回退使用 DocumentAgent。
 * 如果两者都不可用，返回默认值（A4 纵向，普通边距）。
 */
export function usePageSetup() {
  const editorBridge = useDocumentStore((s) => s.editorBridge);

  /** 从编辑器获取当前布局状态 */
  const getCurrentLayout = useCallback((): PageLayoutState => {
    const layout = readCurrentLayout();
    return layout ?? DEFAULT_LAYOUT;
  }, []);

  /** 当前布局状态（从文档读取，或使用默认值） */
  const currentLayout = useMemo(() => getCurrentLayout(), [getCurrentLayout]);

  /** 获取当前边距 */
  const getMargins = useCallback(
    (): Margins => currentLayout.margins,
    [currentLayout.margins]
  );

  /** 获取当前纸张大小 */
  const getPageSize = useCallback(
    (): PaperSize => currentLayout.paperSize,
    [currentLayout.paperSize]
  );

  /** 获取当前方向 */
  const getOrientation = useCallback(
    (): Orientation => currentLayout.orientation,
    [currentLayout.orientation]
  );

  /** 获取建议的页边距预设名称 */
  const getMarginPresetName = useCallback(
    (): string => identifyMarginPreset(currentLayout.margins),
    [currentLayout.margins]
  );

  /** 获取建议的纸张预设名称 */
  const getPaperPresetName = useCallback(
    (): string => identifyPaperPreset(currentLayout.paperSize),
    [currentLayout.paperSize]
  );

  /** 设置页边距 */
  const setMargins = useCallback(
    (margins: Margins): boolean => {
      const bridge = editorBridge;
      if (!bridge) {
        return false;
      }

      // 1. 尝试 getLayout().setMargins()
      const layout = bridge.getLayout() as LayoutAPI | null;
      if (layout?.setMargins) {
        layout.setMargins({
          top: margins.top,
          right: margins.right,
          bottom: margins.bottom,
          left: margins.left,
        });
        return true;
      }

      // 2. 回退：通过 DocumentAgent 设置
      const agent = bridge.getAgent() as DocumentAgent | null;
      if (agent?.executeCommands) {
        agent.executeCommands([
          {
            type: "setSectionProperties",
            margins: {
              top: margins.top,
              right: margins.right,
              bottom: margins.bottom,
              left: margins.left,
            },
          },
        ]);
        return true;
      }

      return false;
    },
    [editorBridge]
  );

  /** 设置纸张大小 */
  const setPageSize = useCallback(
    (size: PaperSize): boolean => {
      const bridge = editorBridge;
      if (!bridge) {
        return false;
      }

      const layout = bridge.getLayout() as LayoutAPI | null;
      if (layout?.setPageSize) {
        layout.setPageSize(size.width, size.height);
        return true;
      }

      const agent = bridge.getAgent() as DocumentAgent | null;
      if (agent?.executeCommands) {
        agent.executeCommands([
          {
            type: "setSectionProperties",
            pageWidth: size.width,
            pageHeight: size.height,
          },
        ]);
        return true;
      }

      return false;
    },
    [editorBridge]
  );

  /** 设置纸张方向 */
  const setOrientation = useCallback(
    (orientation: Orientation): boolean => {
      const bridge = editorBridge;
      if (!bridge) {
        return false;
      }

      const layout = bridge.getLayout() as LayoutAPI | null;
      if (layout?.setOrientation) {
        layout.setOrientation(orientation);
        return true;
      }

      // 回退：交换宽高
      const currentSize = getCurrentLayout().paperSize;
      const newSize = applyOrientationToPaperSize(currentSize, orientation);
      return setPageSize(newSize);
    },
    [editorBridge, setPageSize, getCurrentLayout]
  );

  /** 应用预设页边距 */
  const applyMarginPreset = useCallback(
    (preset: string): boolean => {
      const margins = MARGIN_PRESETS[preset as keyof typeof MARGIN_PRESETS];
      if (!margins || preset === "custom") {
        return false;
      }
      return setMargins(margins);
    },
    [setMargins]
  );

  /** 应用预设纸张 */
  const applyPaperPreset = useCallback(
    (preset: string): boolean => {
      const size = PAPER_PRESETS[preset as keyof typeof PAPER_PRESETS];
      if (!size || preset === "custom") {
        return false;
      }
      const layout = getCurrentLayout();
      const newSize = applyOrientationToPaperSize(size, layout.orientation);
      return setPageSize(newSize);
    },
    [setPageSize, getCurrentLayout]
  );

  return {
    getCurrentLayout,
    getMargins,
    getPageSize,
    getOrientation,
    getMarginPresetName,
    getPaperPresetName,
    setMargins,
    setPageSize,
    setOrientation,
    applyMarginPreset,
    applyPaperPreset,
    /** 编辑器桥接是否已就绪 */
    hasEditor: !!editorBridge,
  };
}
