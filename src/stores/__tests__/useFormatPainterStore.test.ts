// src/stores/__tests__/useFormatPainterStore.test.ts — 格式刷 store 测试
// 验证 store 存储 FormatPainterSnapshot(text + 可选 paragraph)而非旧的 FormatState。
import { beforeEach, describe, expect, it } from "vitest";
import type { FormatPainterSnapshot } from "@/features/ribbon/types/format-painter";
import { useFormatPainterStore } from "../useFormatPainterStore";

describe("useFormatPainterStore", () => {
  beforeEach(() => {
    useFormatPainterStore.setState({ marks: null, active: false });
  });

  it("初始状态:marks 为 null,active 为 false", () => {
    const state = useFormatPainterStore.getState();
    expect(state.marks).toBeNull();
    expect(state.active).toBe(false);
  });

  it("setFormatPainter 存储 text 快照并激活", () => {
    const snapshot: FormatPainterSnapshot = {
      text: {
        bold: true,
        italic: false,
        underline: false,
        strike: false,
        superscript: false,
        subscript: false,
        fontFamily: { ascii: "Calibri", eastAsia: "SimSun" },
        fontSize: 24,
        textColor: "FF0000",
        highlight: "yellow",
      },
    };
    useFormatPainterStore.getState().setFormatPainter(snapshot);
    const state = useFormatPainterStore.getState();
    expect(state.active).toBe(true);
    expect(state.marks).toEqual(snapshot);
  });

  it("setFormatPainter 存储含 paragraph 的完整快照", () => {
    const snapshot: FormatPainterSnapshot = {
      text: {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        superscript: false,
        subscript: false,
        fontFamily: null,
        fontSize: 0,
        textColor: "",
        highlight: "",
      },
      paragraph: {
        alignment: "center",
        lineSpacing: 1.5,
        indentLeft: 567,
        indentRight: 0,
        indentFirstLine: 0,
        spaceBefore: 0,
        spaceAfter: 120,
      },
    };
    useFormatPainterStore.getState().setFormatPainter(snapshot);
    const state = useFormatPainterStore.getState();
    expect(state.marks?.paragraph).toBeDefined();
    expect(state.marks?.paragraph?.alignment).toBe("center");
  });

  it("clearFormatPainter 清除 marks 并取消激活", () => {
    useFormatPainterStore.setState({
      marks: {
        text: {
          bold: true,
          italic: false,
          underline: false,
          strike: false,
          superscript: false,
          subscript: false,
          fontFamily: null,
          fontSize: 0,
          textColor: "",
          highlight: "",
        },
      },
      active: true,
    });
    useFormatPainterStore.getState().clearFormatPainter();
    const state = useFormatPainterStore.getState();
    expect(state.marks).toBeNull();
    expect(state.active).toBe(false);
  });
});
