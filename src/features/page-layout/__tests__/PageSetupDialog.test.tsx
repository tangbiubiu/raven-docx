// features/page-layout/__tests__/PageSetupDialog.test.tsx — 页面设置对话框测试

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageSetupDialog } from "../components/PageSetupDialog";

const { mockGetLayout, mockGetAgent } = vi.hoisted(() => ({
  mockGetLayout: vi.fn(),
  mockGetAgent: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return key.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
      }
      return key;
    },
  }),
}));

vi.mock("@/stores/useDocumentStore", () => {
  const stableBridge = {
    getLayout: () => mockGetLayout(),
    getAgent: () => mockGetAgent(),
  };
  const stableState = { editorBridge: stableBridge };

  const store = vi.fn((selector?: (state: unknown) => unknown) => {
    return selector ? selector(stableState) : stableState;
  });
  (store as unknown as Record<string, unknown>).getState = () => stableState;
  return { useDocumentStore: store };
});

const baseLayout = {
  getMargins: () => ({ top: 1440, right: 1440, bottom: 1440, left: 1440 }),
  getPageSize: () => ({ width: 11906, height: 16838 }),
  getOrientation: () => "portrait" as const,
};

describe("PageSetupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLayout.mockReturnValue(baseLayout);
    mockGetAgent.mockReturnValue(null);
  });

  it("open=false 时不渲染内容", () => {
    render(<PageSetupDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("pageSetup.title")).not.toBeInTheDocument();
  });

  it("open=true 时渲染对话框标题", () => {
    render(<PageSetupDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText("pageSetup.title")).toBeInTheDocument();
  });

  it("显示页边距预设选项", () => {
    render(<PageSetupDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText("pageSetup.margins.preset")).toBeInTheDocument();
  });

  it("显示纸张大小预设", () => {
    render(<PageSetupDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText("pageSetup.paperSize")).toBeInTheDocument();
  });

  it("显示纸张方向选项", () => {
    render(<PageSetupDialog open={true} onClose={vi.fn()} />);
    expect(
      screen.getByText("pageSetup.orientation.portrait"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pageSetup.orientation.landscape"),
    ).toBeInTheDocument();
  });

  it("确认按钮调用 onClose", () => {
    const onClose = vi.fn();
    render(<PageSetupDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("dialog.confirm"));
    expect(onClose).toHaveBeenCalled();
  });

  it("取消按钮调用 onClose", () => {
    const onClose = vi.fn();
    render(<PageSetupDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("dialog.cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
