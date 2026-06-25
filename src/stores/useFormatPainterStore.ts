// useFormatPainterStore.ts — 格式刷独立状态 (Format Painter State)
// 独立于 useAppStore,避免与其它 phase 的 store 扩展冲突。
// 存储 marks 快照 + active 布尔,供 FormatPainter 组件读写。
// Reference: .dev/plan/2026-06-23-ribbon-enhancement.md §Phase 2.7

import { create } from "zustand";
import type { FormatState } from "@/stores/useDocumentStore";

/** 格式刷状态 / Format painter state */
export type FormatPainterState = {
  /** 已复制的选区 marks 快照 / Copied selection marks snapshot */
  marks: FormatState | null;
  /** 格式刷是否激活(等待应用目标)/ Painter active (awaiting target) */
  active: boolean;

  /** 激活格式刷并存储 marks 快照 / Activate with marks snapshot */
  setFormatPainter: (marks: FormatState) => void;
  /** 清除格式刷(取消激活)/ Clear (deactivate) */
  clearFormatPainter: () => void;
};

export const useFormatPainterStore = create<FormatPainterState>((set) => ({
  marks: null,
  active: false,

  setFormatPainter: (marks) => set({ marks, active: true }),
  clearFormatPainter: () => set({ marks: null, active: false }),
}));
