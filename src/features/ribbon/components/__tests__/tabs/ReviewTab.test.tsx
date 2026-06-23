// src/features/ribbon/components/__tests__/tabs/ReviewTab.test.tsx — 审阅标签页测试 / Review tab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewTab } from "../../tabs/ReviewTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: vi.fn((selector) => {
    const state = { charCount: 42 };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

const props = {
  onNew: vi.fn(),
  onOpen: vi.fn(),
  onSave: vi.fn(),
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onToggleOutline: vi.fn(),
  onToggleAgentSidebar: vi.fn(),
  onPageSetup: vi.fn(),
  onHeaderFooter: vi.fn(),
  onNewComment: vi.fn(),
  onInsertPageBreak: vi.fn(),
};

describe("ReviewTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染批注组和校对组", () => {
    render(<ReviewTab {...props} />);
    expect(screen.getByText("ribbon.group.comments")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.proofing")).toBeInTheDocument();
  });

  it("点击新建批注触发 onNewComment", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-newComment"));
    expect(props.onNewComment).toHaveBeenCalled();
  });

  it("点击字数统计弹出对话框", () => {
    render(<ReviewTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-wordCount"));
    expect(screen.getByText("ribbon.charCount.title")).toBeInTheDocument();
  });
});
