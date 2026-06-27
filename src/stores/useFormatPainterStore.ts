// useFormatPainterStore.ts — 格式刷独立状态 (Format Painter State)
// 独立于 useAppStore,避免与其它 phase 的 store 扩展冲突。
// 存储 FormatPainterSnapshot(text + 可选 paragraph) + active 布尔。
// Reference: .dev/plan/2026-06-25-format-painter-redesign.md §Phase 2

import { create } from "zustand";
import type { FormatPainterSnapshot } from "@/features/ribbon/types/format-painter";

/** 格式刷状态 / Format painter state */
export type FormatPainterState = {
  /** 已复制的选区快照 / Copied selection snapshot */
  marks: FormatPainterSnapshot | null;
  /** 格式刷是否激活(等待应用目标)/ Painter active (awaiting target) */
  active: boolean;

  /** 激活格式刷并存储快照 / Activate with snapshot */
  setFormatPainter: (marks: FormatPainterSnapshot) => void;
  /** 清除格式刷(取消激活)/ Clear (deactivate) */
  clearFormatPainter: () => void;
};

export const useFormatPainterStore = create<FormatPainterState>((set) => ({
  marks: null,
  active: false,

  setFormatPainter: (marks) => set({ marks, active: true }),
  clearFormatPainter: () => set({ marks: null, active: false }),
}));
