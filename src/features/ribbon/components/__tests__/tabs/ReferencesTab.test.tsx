// src/features/ribbon/components/__tests__/tabs/ReferencesTab.test.tsx — ReferencesTab 测试 / ReferencesTab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReferencesTab } from "../../tabs/ReferencesTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/features/table/components/FootnoteDialog", () => ({
  FootnoteDialog: () => <div>插入脚注</div>,
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

describe("ReferencesTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染脚注组和目录组", () => {
    render(<ReferencesTab {...props} />);
    expect(screen.getByText("ribbon.group.footnote")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.toc")).toBeInTheDocument();
  });

  it("点击脚注按钮弹出脚注对话框", () => {
    render(<ReferencesTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-insertFootnote"));
    expect(screen.getByText("插入脚注")).toBeInTheDocument();
  });
});
