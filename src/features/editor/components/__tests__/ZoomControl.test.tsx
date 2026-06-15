// features/editor/components/__tests__/ZoomControl.test.tsx — ZoomControl 组件测试
// TDD: 红阶段 → 绿阶段 → 重构

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { ZoomControl } from "../ZoomControl";

describe("ZoomControl", () => {
  beforeEach(() => {
    // 完全重置 store 到初始状态
    useDocumentStore.setState({ zoom: 100 });
  });

  it("显示当前缩放百分比", () => {
    useDocumentStore.setState({ zoom: 125 });
    render(<ZoomControl />);
    expect(screen.getByText("125%")).toBeInTheDocument();
  });

  it("slider 值变化时调用 setZoom", () => {
    render(<ZoomControl />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "150" } });
    expect(useDocumentStore.getState().zoom).toBe(150);
  });

  it("点击重置按钮恢复 100%", async () => {
    useDocumentStore.setState({ zoom: 150 });
    const user = userEvent.setup();
    render(<ZoomControl />);

    // zoom=150 时显示 100% 重置按钮
    const resetBtn = screen.getByRole("button", { name: "100%" });
    await user.click(resetBtn);
    expect(useDocumentStore.getState().zoom).toBe(100);
  });
});
