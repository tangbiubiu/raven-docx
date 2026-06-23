// src/features/ribbon/components/__tests__/tabs/InsertTab.test.tsx — InsertTab 测试 / Insert tab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsertTab } from "../../tabs/InsertTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/features/table/components/InsertTableGrid", () => ({
  InsertTableGrid: ({ onClose }: { onClose: () => void }) => (
    <div>
      选择表格大小
      <button onClick={onClose} type="button">
        close
      </button>
    </div>
  ),
}));
vi.mock("@/features/table/components/HyperlinkDialog", () => ({
  HyperlinkDialog: () => <div>插入超链接</div>,
}));
vi.mock("@/features/table/components/FootnoteDialog", () => ({
  FootnoteDialog: () => <div>插入脚注</div>,
}));
vi.mock("@/features/table/components/InsertImageButton", () => ({
  InsertImageButton: () => (
    <button data-testid="ribbon-insertImage" type="button">
      图片
    </button>
  ),
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

describe("InsertTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染表格/链接/脚注/页面组", () => {
    render(<InsertTab {...props} />);
    expect(screen.getByText("ribbon.group.table")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.link")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.footnote")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.page")).toBeInTheDocument();
  });

  it("点击表格按钮弹出表格网格", () => {
    render(<InsertTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-insertTable"));
    expect(screen.getByText("选择表格大小")).toBeInTheDocument();
  });

  it("点击分页符触发 onInsertPageBreak", () => {
    render(<InsertTab {...props} />);
    fireEvent.click(screen.getByTestId("ribbon-pageBreak"));
    expect(props.onInsertPageBreak).toHaveBeenCalled();
  });
});
