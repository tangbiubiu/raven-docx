// src/features/ribbon/components/__tests__/tabs/PictureFormatTab.test.tsx — PictureFormatTab 测试 / PictureFormatTab tests
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PictureFormatTab } from "../../tabs/PictureFormatTab";

vi.mock("@/lib/i18n", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

const mockCmds = vi.hoisted(() => ({
  execSetImageWrapType: vi.fn(),
}));
vi.mock("@/features/editor/commands", () => mockCmds);

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

describe("PictureFormatTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染图片格式按钮组", () => {
    render(<PictureFormatTab {...props} />);
    expect(screen.getByText("ribbon.group.wrap")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.size")).toBeInTheDocument();
    expect(screen.getByText("ribbon.group.border")).toBeInTheDocument();
  });

  it("环绕类型下拉选择调用 execSetImageWrapType", () => {
    render(<PictureFormatTab {...props} />);
    const select = screen.getByTestId("ribbon-imageWrap");
    fireEvent.change(select, { target: { value: "square" } });
    expect(mockCmds.execSetImageWrapType).toHaveBeenCalledWith("square");
  });

  it("宽度数值输入渲染", () => {
    render(<PictureFormatTab {...props} />);
    expect(screen.getByTestId("ribbon-imageWidth")).toBeInTheDocument();
  });

  it("高度数值输入渲染", () => {
    render(<PictureFormatTab {...props} />);
    expect(screen.getByTestId("ribbon-imageHeight")).toBeInTheDocument();
  });

  it("裁剪按钮渲染", () => {
    render(<PictureFormatTab {...props} />);
    expect(screen.getByTestId("ribbon-cropImage")).toBeInTheDocument();
  });

  it("边框颜色选择渲染", () => {
    render(<PictureFormatTab {...props} />);
    expect(screen.getByTestId("ribbon-imageBorderColor")).toBeInTheDocument();
  });
});
