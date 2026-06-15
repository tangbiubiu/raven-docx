// features/editor/components/__tests__/Ruler.test.tsx — Ruler 组件测试
// TDD: 红阶段 → 绿阶段 → 重构

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { Ruler } from "../Ruler";

const PATTERN_2_5 = /2\.5/;
const PATTERN_1_0 = /1\.0/;

/** 创建包含布局信息的 mock bridge */
function makeBridgeWithLayout(pageOverrides?: Record<string, unknown>) {
  const defaultPage = {
    number: 1,
    size: { w: 612, h: 792 },
    margins: { left: 96, right: 96, top: 72, bottom: 72 },
    ...pageOverrides,
  };
  return {
    save: async () => null,
    focus: () => {
      // no-op for test mock
    },
    getAgent: () => null,
    getDocument: () => null,
    getLayout: () => ({ pageSize: { w: 612, h: 792 }, pages: [defaultPage] }),
    getSelectionInfo: () => null,
    applyFormatting: () => false,
    setParagraphStyle: () => false,
    scrollToParaId: () => false,
    setZoom: () => {
      // no-op for test mock
    },
  };
}

describe("Ruler", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
    useDocumentStore.setState({ zoom: 100 });
  });

  it("无布局数据时返回 null", () => {
    useDocumentStore.getState().setEditorBridge(null);

    const { container } = render(<Ruler />);
    expect(container.firstChild).toBeNull();
  });

  it("有布局数据时渲染水平标尺", () => {
    useDocumentStore
      .getState()
      .setEditorBridge(makeBridgeWithLayout() as never);
    render(<Ruler />);

    const horizontal = document.querySelector('[title="horizontal ruler"]');
    expect(horizontal).toBeInTheDocument();
  });

  it("有布局数据时渲染垂直标尺", () => {
    useDocumentStore
      .getState()
      .setEditorBridge(makeBridgeWithLayout() as never);
    render(<Ruler />);

    const vertical = document.querySelector('[title="vertical ruler"]');
    expect(vertical).toBeInTheDocument();
  });

  it("根据缩放比例调整标尺宽度", () => {
    useDocumentStore
      .getState()
      .setEditorBridge(makeBridgeWithLayout() as never);
    useDocumentStore.setState({ zoom: 200 });

    render(<Ruler />);
    const horizontal = document.querySelector(
      '[title="horizontal ruler"]'
    ) as HTMLElement;

    // zoom=200 时宽度应为 612 * 2 = 1224px
    expect(horizontal.style.width).toBe("1224px");
  });

  it("cm 单位时显示页边距数值", () => {
    useDocumentStore
      .getState()
      .setEditorBridge(makeBridgeWithLayout() as never);
    render(<Ruler unit="cm" />);

    // 左边距 96px => 96 * 2.54/96 ≈ 2.5cm
    expect(document.body.textContent).toMatch(PATTERN_2_5);
  });

  it("inch 单位时显示页边距数值", () => {
    useDocumentStore
      .getState()
      .setEditorBridge(makeBridgeWithLayout() as never);
    render(<Ruler unit="inch" />);

    // 左边距 96px => 96/96 = 1.0in
    expect(document.body.textContent).toMatch(PATTERN_1_0);
  });
});
