// biome-ignore-all lint/performance/useTopLevelRegex: test file — regex in assertions is standard
// features/editor/components/__tests__/StatusBar.test.tsx — StatusBar 组件测试
// TDD: 红阶段 → 绿阶段 → 重构

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { StatusBar } from "../StatusBar";

describe("StatusBar", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
    useDocumentStore.getState().setZoom(100);
  });

  it("isDirty=true 时显示「未保存」", () => {
    useDocumentStore.getState().setDirty(true);
    render(<StatusBar />);
    expect(screen.getByText(/未保存/)).toBeInTheDocument();
  });

  it("isDirty=false 时显示「已保存」", () => {
    useDocumentStore.getState().setDirty(false);
    render(<StatusBar />);
    expect(screen.getByText(/已保存/)).toBeInTheDocument();
  });

  it("正确显示 currentPage / totalPages", () => {
    useDocumentStore.getState().setPageInfo(3, 10);
    render(<StatusBar />);
    expect(screen.getByText(/第 3\/10 页/)).toBeInTheDocument();
  });

  it("正确显示缩放比例", () => {
    useDocumentStore.getState().setZoom(120);
    render(<StatusBar />);
    expect(screen.getByText(/120%/)).toBeInTheDocument();
  });

  it("显示语言标识", () => {
    render(<StatusBar />);
    expect(screen.getByText(/中文/)).toBeInTheDocument();
  });

  it("isAutoSaving=true 时显示自动保存中指示器", () => {
    useDocumentStore.getState().setAutoSaving(true);
    render(<StatusBar />);
    expect(screen.getByText(/自动保存中/)).toBeInTheDocument();
  });

  it("isAutoSaving=false 时不显示自动保存指示器", () => {
    useDocumentStore.getState().setAutoSaving(false);
    render(<StatusBar />);
    expect(screen.queryByText(/自动保存中/)).toBeNull();
  });
});
