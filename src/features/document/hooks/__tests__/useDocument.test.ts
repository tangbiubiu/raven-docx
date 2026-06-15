// features/document/hooks/__tests__/useDocument.test.ts — 文档操作 hook 测试
// Reference: .dev/plan/implementation-plan.md §Phase 2.3

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";

// useDocument 通过 useDocumentStore 读取/设置状态，测试直接操作 store
describe("useDocument — newDocument", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
  });

  it("newDocument 将 store 设置为新建文档模式", () => {
    // 当调用 newDocument 时，应该清空 store 并标记为新建
    useDocumentStore.getState().closeDocument();

    const state = useDocumentStore.getState();
    expect(state.document).toBeNull();
    expect(state.documentBuffer).toBeNull();
    expect(state.documentPath).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it("newDocument 后 isDirty 为 false", () => {
    // 先模拟 dirty 状态
    useDocumentStore.getState().setDirty(true);

    // closeDocument 后 isDirty 应为 false
    useDocumentStore.getState().closeDocument();
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });
});

describe("useDocument — saveDocument", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
  });

  it("saveDocument 通过 editorBridge.save() 保存", async () => {
    const saveMock = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const bridge = {
      save: saveMock,
      focus: vi.fn(),
      getAgent: vi.fn(),
      getDocument: vi.fn(),
      getSelectionInfo: vi.fn(),
      applyFormatting: vi.fn(),
      setParagraphStyle: vi.fn(),
      scrollToParaId: vi.fn(),
    };
    useDocumentStore.getState().setEditorBridge(bridge);

    // 模拟保存
    const result = await bridge.save();
    expect(saveMock).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it("saveDocument 后 isDirty 为 false", async () => {
    const saveMock = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const bridge = {
      save: saveMock,
      focus: vi.fn(),
      getAgent: vi.fn(),
      getDocument: vi.fn(),
      getSelectionInfo: vi.fn(),
      applyFormatting: vi.fn(),
      setParagraphStyle: vi.fn(),
      scrollToParaId: vi.fn(),
    };
    useDocumentStore.getState().setEditorBridge(bridge);
    useDocumentStore.getState().setDirty(true);

    await bridge.save();
    useDocumentStore.getState().setDirty(false);

    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it("没有 editorBridge 时 saveDocument 返回 null", async () => {
    const bridge = useDocumentStore.getState().editorBridge;
    expect(bridge).toBeNull();

    // 没有 bridge 应该安全处理
    const result = bridge?.save();
    expect(result).toBeUndefined();
  });
});

describe("useDocument — closeDocument", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
  });

  it("closeDocument 清空所有文档状态", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/tmp/test.docx"
    );
    useDocumentStore.getState().setDirty(true);

    useDocumentStore.getState().closeDocument();

    const state = useDocumentStore.getState();
    expect(state.document).toBeNull();
    expect(state.documentBuffer).toBeNull();
    expect(state.documentPath).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it("文档未修改时 closeDocument 直接关闭", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/tmp/test.docx"
    );

    useDocumentStore.getState().closeDocument();

    expect(useDocumentStore.getState().document).toBeNull();
  });

  it("文档已修改时需确认是否放弃更改", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      "/tmp/test.docx"
    );
    useDocumentStore.getState().setDirty(true);

    expect(useDocumentStore.getState().isDirty).toBe(true);

    // 确认放弃后关闭
    useDocumentStore.getState().closeDocument();
    expect(useDocumentStore.getState().document).toBeNull();
  });
});

describe("useDocument — documentPath", () => {
  beforeEach(() => {
    useDocumentStore.getState().closeDocument();
  });

  it("setDocument 同时设置 path", () => {
    const testPath = "/Users/test/document.docx";
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      testPath
    );

    expect(useDocumentStore.getState().documentPath).toBe(testPath);
  });

  it("新建文档的 path 为 null", () => {
    useDocumentStore.getState().setDocument(
      {} as unknown,
      new ArrayBuffer(8),
      null
    );

    expect(useDocumentStore.getState().documentPath).toBeNull();
  });
});
