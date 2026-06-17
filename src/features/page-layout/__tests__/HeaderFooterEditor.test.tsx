// features/page-layout/__tests__/HeaderFooterEditor.test.tsx — 页眉页脚编辑器测试

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderFooterEditor } from "../components/HeaderFooterEditor";

// Mock useT
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

describe("HeaderFooterEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open=true 时渲染对话框", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    expect(screen.getByText("headerFooter.title")).toBeInTheDocument();
  });

  it("默认显示页眉标签页", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    expect(screen.getByText("headerFooter.header")).toBeInTheDocument();
    expect(screen.getByText("headerFooter.footer")).toBeInTheDocument();
  });

  it("渲染三个内容区域输入框", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    expect(screen.getByText("headerFooter.left")).toBeInTheDocument();
    expect(screen.getByText("headerFooter.center")).toBeInTheDocument();
    expect(screen.getByText("headerFooter.right")).toBeInTheDocument();
  });

  it("显示插入字段按钮", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    expect(
      screen.getByText("headerFooter.insertPageNumber")
    ).toBeInTheDocument();
    expect(screen.getByText("headerFooter.insertDate")).toBeInTheDocument();
    expect(screen.getByText("headerFooter.insertFileName")).toBeInTheDocument();
  });

  it("显示选项复选框", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    expect(
      screen.getByText("headerFooter.differentFirstPage")
    ).toBeInTheDocument();
    expect(
      screen.getByText("headerFooter.differentOddEven")
    ).toBeInTheDocument();
  });

  it("确认按钮调用 onClose", () => {
    const onClose = vi.fn();
    render(<HeaderFooterEditor onClose={onClose} open={true} />);
    fireEvent.click(screen.getByText("dialog.confirm"));
    expect(onClose).toHaveBeenCalled();
  });

  it("取消按钮调用 onClose", () => {
    const onClose = vi.fn();
    render(<HeaderFooterEditor onClose={onClose} open={true} />);
    fireEvent.click(screen.getByText("dialog.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("可以输入页眉内容", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    const inputs = screen.getAllByPlaceholderText("headerFooter.placeholder");
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    fireEvent.change(inputs[0], {
      target: { value: "测试页眉" },
    });
    expect(inputs[0]).toHaveValue("测试页眉");
  });

  it("点击页脚标签切换", () => {
    render(<HeaderFooterEditor onClose={vi.fn()} open={true} />);
    const footerTab = screen.getByText("headerFooter.footer");
    fireEvent.click(footerTab);
    // 页脚输入框仍然可见
    expect(screen.getByText("headerFooter.left")).toBeInTheDocument();
  });

  it("confirm 后触发 onApply 回调", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <HeaderFooterEditor onApply={onApply} onClose={onClose} open={true} />
    );

    fireEvent.click(screen.getByText("dialog.confirm"));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          left: "",
          center: "",
          right: "",
        }),
        footer: expect.objectContaining({
          left: "",
          center: "",
          right: "",
        }),
        differentFirstPage: false,
        differentOddEven: false,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("接受并显示 initialConfig", () => {
    const initialConfig = {
      header: { left: "公司名称", center: "", right: "" },
      footer: { left: "", center: "第 {PAGE} 页", right: "" },
      differentFirstPage: true,
      differentOddEven: false,
    };

    render(
      <HeaderFooterEditor
        initialConfig={initialConfig}
        onClose={vi.fn()}
        open={true}
      />
    );

    const inputs = screen.getAllByPlaceholderText("headerFooter.placeholder");
    expect(inputs[0]).toHaveValue("公司名称");
  });
});
