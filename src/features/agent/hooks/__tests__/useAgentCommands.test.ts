// features/agent/hooks/__tests__/useAgentCommands.test.ts — Agent 命令执行 Hook 单元测试
// Reference: .dev/plan/phase3-branch-plan.md §4.3, §4.7

import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStore } from "@/stores/useAgentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import {
  type AgentCommand,
  parseAgentResponse,
  useAgentCommands,
} from "../useAgentCommands";

// ============================================================
// parseAgentResponse — 纯函数单元测试 (18 tests)
// ============================================================

describe("parseAgentResponse", () => {
  describe("纯文本回退", () => {
    it("将纯文本视为 newText", () => {
      const result = parseAgentResponse("这是润色后的文本。");
      expect(result).toEqual({ success: true, newText: "这是润色后的文本。" });
    });
    it("处理空字符串", () => {
      const result = parseAgentResponse("");
      expect(result).toEqual({ success: true, newText: "" });
    });
    it("处理多行纯文本", () => {
      const text = "第一段文字。\n\n第二段文字。";
      const result = parseAgentResponse(text);
      expect(result.success).toBe(true);
      expect(result.newText).toBe(text);
    });
  });

  describe("JSON 解析 — newText", () => {
    it("从 JSON 对象中提取 newText", () => {
      const result = parseAgentResponse('{"newText": "已润色的文本内容"}');
      expect(result).toEqual({ success: true, newText: "已润色的文本内容" });
    });
    it("从 markdown code fence 中提取 JSON newText", () => {
      const input = ["```json", '{"newText": "已润色的文本内容"}', "```"].join(
        "\n"
      );
      const result = parseAgentResponse(input);
      expect(result).toEqual({ success: true, newText: "已润色的文本内容" });
    });
    it("从无语言标注的 code fence 中提取 JSON", () => {
      const input = ["```", '{"newText": "扩写内容"}', "```"].join("\n");
      const result = parseAgentResponse(input);
      expect(result).toEqual({ success: true, newText: "扩写内容" });
    });
    it("newText 为空字符串时正确返回", () => {
      const result = parseAgentResponse('{"newText": ""}');
      expect(result).toEqual({ success: true, newText: "" });
    });
  });

  describe("JSON 解析 — commands", () => {
    it("从 JSON 对象中提取 commands 数组", () => {
      const commands: AgentCommand[] = [
        { type: "replaceText", paraIndex: 0, text: "新文本" },
        { type: "applyStyle", paraIndex: 1, styleId: "Heading1" },
      ];
      const result = parseAgentResponse(JSON.stringify({ commands }));
      expect(result).toEqual({ success: true, commands });
    });
    it("从 markdown code fence 中提取 commands", () => {
      const commands: AgentCommand[] = [
        { type: "insertTable", position: 0, rows: 3, cols: 3 },
      ];
      const input = [
        "以下是操作命令：",
        "```json",
        JSON.stringify({ commands }),
        "```",
      ].join("\n");
      const result = parseAgentResponse(input);
      expect(result).toEqual({ success: true, commands });
    });
    it("commands 为空数组时正确返回", () => {
      const result = parseAgentResponse('{"commands": []}');
      expect(result).toEqual({ success: true, commands: [] });
    });
    it("优先解析 commands 而非 newText（两者同时存在时）", () => {
      const input = JSON.stringify({
        newText: "文本",
        commands: [{ type: "deleteText", paraIndex: 0 }],
      });
      const result = parseAgentResponse(input);
      expect(result.success).toBe(true);
      expect(result.commands).toBeDefined();
      expect(result.newText).toBeUndefined();
    });
  });

  describe("错误响应", () => {
    it("解析带 error 字段的 JSON", () => {
      const result = parseAgentResponse('{"error": "无法处理该请求"}');
      expect(result).toEqual({ success: false, error: "无法处理该请求" });
    });
    it("从 code fence 中解析 error", () => {
      const input = ["```json", '{"error": "文档过大，无法处理"}', "```"].join(
        "\n"
      );
      const result = parseAgentResponse(input);
      expect(result).toEqual({ success: false, error: "文档过大，无法处理" });
    });
  });

  describe("边界情况", () => {
    it("无效 JSON 回退为 newText", () => {
      const text = "这是 { 不完整的 JSON";
      const result = parseAgentResponse(text);
      expect(result).toEqual({ success: true, newText: text });
    });
    it("非对象 JSON (如数组) 回退为 newText", () => {
      const result = parseAgentResponse("[1, 2, 3]");
      expect(result).toEqual({ success: true, newText: "[1, 2, 3]" });
    });
    it("null JSON 回退为 newText", () => {
      const result = parseAgentResponse("null");
      expect(result).toEqual({ success: true, newText: "null" });
    });
    it("JSON 对象无预期字段时，整段文本视为 newText", () => {
      const result = parseAgentResponse('{"foo": "bar"}');
      expect(result).toEqual({ success: true, newText: '{"foo": "bar"}' });
    });
    it("只匹配第一个 code fence 中的 JSON", () => {
      const input = [
        "```json",
        '{"newText": "第一个"}',
        "```",
        "```json",
        '{"newText": "第二个"}',
        "```",
      ].join("\n");
      const result = parseAgentResponse(input);
      expect(result.newText).toBe("第一个");
    });
  });
});

// ============================================================
// applyResponse — 集成测试 (6 tests)
// ============================================================

// 模拟 useAgentSession，避免 Tauri 事件系统依赖
vi.mock("@/features/agent/hooks/useAgentSession", () => ({
  useAgentSession: () => ({
    status: "ready",
    error: null,
    messages: [],
    isStreaming: false,
    send: vi.fn().mockResolvedValue("msg-id"),
    abort: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
    contextBadge: null,
  }),
}));

/**
 * 创建 mock EditorBridge。
 * ProseMirror EditorView 结构: view.state.tr.replaceWith(...)
 */
function createMockBridge(opts?: {
  executeCommands?: (cmds: unknown[]) => Promise<void>;
}) {
  const executeCommands =
    opts?.executeCommands ?? vi.fn().mockResolvedValue(undefined);
  const mockDispatch = vi.fn();
  const mockReplaceWith = vi.fn().mockReturnValue({ mockTr: true });
  const mockView = {
    state: {
      tr: { replaceWith: mockReplaceWith },
      schema: { text: (t: string) => t },
    },
  };

  return {
    save: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    focus: vi.fn(),
    getAgent: vi.fn().mockReturnValue({ executeCommands }),
    getDocument: vi.fn(),
    getLayout: vi.fn(),
    getSelectionInfo: vi.fn(),
    getEditorView: vi.fn().mockReturnValue(mockView),
    dispatchTransaction: mockDispatch,
    applyFormatting: vi.fn(),
    setParagraphStyle: vi.fn(),
    scrollToParaId: vi.fn(),
    setZoom: vi.fn(),
    openPrintPreview: vi.fn(),
    print: vi.fn(),
  };
}

describe("applyResponse", () => {
  beforeEach(() => {
    mockIPC((cmd) => {
      if (cmd === "plugin:log|log") return;
      return null;
    });

    useDocumentStore.setState({
      editorBridge: null,
      selectionInfo: null,
      documentPath: "/test/doc.docx",
      documentBuffer: new ArrayBuffer(8),
    });
    useAgentStore.getState().reset();
  });

  afterEach(() => {
    clearMocks();
    vi.clearAllMocks();
  });

  it("通过 dispatchTransaction 应用 newText 替换选区", async () => {
    const bridge = createMockBridge();
    useDocumentStore.setState({
      editorBridge: bridge,
      selectionInfo: { from: 10, to: 20, text: "原始文本" },
    });

    const { result } = renderHook(() => useAgentCommands());

    await act(async () => {
      await result.current.applyResponse({
        success: true,
        newText: "润色后的文本",
      });
    });

    expect(bridge.dispatchTransaction).toHaveBeenCalledOnce();

    const view = bridge.getEditorView();
    expect(view.state.tr.replaceWith).toHaveBeenCalledWith(
      10,
      20,
      view.state.schema.text("润色后的文本")
    );
  });

  it("通过 getAgent().executeCommands() 执行批量命令", async () => {
    const executeCommands = vi.fn().mockResolvedValue(undefined);
    const bridge = createMockBridge({ executeCommands });
    useDocumentStore.setState({ editorBridge: bridge });

    const commands: AgentCommand[] = [
      { type: "replaceText", paraIndex: 0, text: "新文本" },
      { type: "applyStyle", paraIndex: 1, styleId: "Heading1" },
    ];

    const { result } = renderHook(() => useAgentCommands());

    await act(async () => {
      await result.current.applyResponse({ success: true, commands });
    });

    expect(executeCommands).toHaveBeenCalledOnce();
    expect(executeCommands).toHaveBeenCalledWith(commands);
  });

  it("newText 为空字符串时仍然执行替换", async () => {
    const bridge = createMockBridge();
    useDocumentStore.setState({
      editorBridge: bridge,
      selectionInfo: { from: 5, to: 5, text: "" },
    });

    const { result } = renderHook(() => useAgentCommands());

    await act(async () => {
      await result.current.applyResponse({ success: true, newText: "" });
    });

    expect(bridge.dispatchTransaction).toHaveBeenCalledOnce();
    const view = bridge.getEditorView();
    expect(view.state.tr.replaceWith).toHaveBeenCalledWith(5, 5, "");
  });

  it("编辑器桥接不可用时抛出错误", async () => {
    const { result } = renderHook(() => useAgentCommands());

    await expect(
      act(async () => {
        await result.current.applyResponse({ success: true, newText: "测试" });
      })
    ).rejects.toThrow("编辑器桥接不可用");
  });

  it("选区信息不可用时抛出错误", async () => {
    const bridge = createMockBridge();
    useDocumentStore.setState({ editorBridge: bridge, selectionInfo: null });

    const { result } = renderHook(() => useAgentCommands());

    await expect(
      act(async () => {
        await result.current.applyResponse({ success: true, newText: "测试" });
      })
    ).rejects.toThrow("选区信息不可用");
  });

  it("commands 为空数组时回退到 newText 文本替换路径", async () => {
    const executeCommands = vi.fn();
    const bridge = createMockBridge({ executeCommands });
    useDocumentStore.setState({
      editorBridge: bridge,
      selectionInfo: { from: 0, to: 0, text: "" },
    });

    const { result } = renderHook(() => useAgentCommands());

    await act(async () => {
      await result.current.applyResponse({
        success: true,
        commands: [],
        newText: "回退到文本模式",
      });
    });

    expect(executeCommands).not.toHaveBeenCalled();
    expect(bridge.dispatchTransaction).toHaveBeenCalledOnce();
  });
});
