// biome-ignore-all lint/performance/useTopLevelRegex: test file — regex in assertions is standard
// features/editor/components/__tests__/EditorPane.test.tsx — EditorPane 组件测试
// TDD: 红阶段 → 绿阶段 → 重构

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock DocxEditor 和 createEmptyDocument
vi.mock("@eigenpal/docx-editor-react", () => {
  const DummyDoc = { type: "document", children: [] };
  return {
    DocxEditor: vi.fn((props: Record<string, unknown>) => {
      const { documentBuffer, ...rest } = props;
      return (
        <div data-props={JSON.stringify(rest)} data-testid="docx-editor">
          {documentBuffer !== null ? "document-loaded" : "ready"}
        </div>
      );
    }),
    createEmptyDocument: vi.fn(() => DummyDoc),
  };
});

import { useSettingsStore } from "@/stores/useSettingsStore";
import { EditorPane } from "../EditorPane";

describe("EditorPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("无文档时显示空状态提示", () => {
    render(<EditorPane />);
    expect(screen.getByTestId("editor-pane-empty")).toBeInTheDocument();
    expect(screen.getByText(/打开或新建一个文档/)).toBeInTheDocument();
  });

  it("isNewDocument 时渲染 DocxEditor 并传入空文档", () => {
    render(<EditorPane isNewDocument />);
    const el = screen.getByTestId("docx-editor");
    expect(el).toBeInTheDocument();
    const props = JSON.parse(el.dataset.props ?? "{}");
    expect(props.document).toBeDefined();
    expect(props.document.type).toBe("document");
  });

  it("documentBuffer 传入时渲染 DocxEditor", () => {
    const buffer = new ArrayBuffer(16);
    render(<EditorPane documentBuffer={buffer} />);
    const el = screen.getByTestId("docx-editor");
    expect(el).toBeInTheDocument();
    expect(el.textContent).toBe("document-loaded");
  });

  it("传入正确的 DocxEditor props", () => {
    render(<EditorPane isNewDocument />);
    const props = JSON.parse(
      screen.getByTestId("docx-editor").dataset.props ?? "{}"
    );
    expect(props.showToolbar).toBe(false);
    expect(props.showZoomControl).toBe(false);
    expect(props.showOutline).toBe(false);
    expect(props.showOutlineButton).toBe(false);
    expect(props.showMarginGuides).toBe(false);
    expect(props.showRuler).toBe(false);
  });

  it("locale 为 zh-CN 时传入 zhCN 翻译对象", () => {
    useSettingsStore.setState({
      editorConfig: {
        ...useSettingsStore.getState().editorConfig,
        locale: "zh-CN",
      },
    });
    render(<EditorPane isNewDocument />);
    const props = JSON.parse(
      screen.getByTestId("docx-editor").dataset.props ?? "{}"
    );
    expect(props.i18n).toBeDefined();
    expect(props.i18n._lang).toBe("zh-CN");
  });

  it("locale 为 en 时不传 i18n（回落到编辑器默认英文）", () => {
    useSettingsStore.setState({
      editorConfig: {
        ...useSettingsStore.getState().editorConfig,
        locale: "en",
      },
    });
    render(<EditorPane isNewDocument />);
    const props = JSON.parse(
      screen.getByTestId("docx-editor").dataset.props ?? "{}"
    );
    expect(props.i18n).toBeUndefined();
  });
});
