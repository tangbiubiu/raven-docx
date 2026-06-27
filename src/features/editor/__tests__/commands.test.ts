// src/features/editor/__tests__/commands.test.ts — commands.ts 测试
// 验证 exec* 封装函数调用正确的 docx-editor-core PM 命令并传递正确参数。

import type { Command } from "prosemirror-state";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mock docx-editor-core PM 命令 ---
// 真实命令需要完整 ProseMirror schema,测试环境不具备,故 mock 模块。
const mockCmds = vi.hoisted(() => {
  const mkCmd = vi.fn((): Command => vi.fn(() => true) as unknown as Command);
  return {
    setFontFamily: vi.fn((_name: string) => mkCmd()),
    setFontSize: vi.fn((_size: number) => mkCmd()),
    setTextColor: vi.fn((_attrs: unknown) => mkCmd()),
    setHighlight: vi.fn((_color: string) => mkCmd()),
    insertTable: vi.fn((_rows: number, _cols: number) => mkCmd()),
    // Phase 1: 设值/清除 mark 命令 / set/remove/clear mark commands
    createSetMarkCommand: vi.fn(
      (_markType: unknown, _attrs?: Record<string, unknown>) => mkCmd()
    ),
    createRemoveMarkCommand: vi.fn((_markType: unknown) => mkCmd()),
    clearFontFamily: mkCmd(),
    clearFontSize: mkCmd(),
    clearTextColor: mkCmd(),
    clearHighlight: mkCmd(),
    // Phase 3: 段落格式 / paragraph formatting
    setLineSpacing: vi.fn((_value: number) => mkCmd()),
    setSpaceBefore: vi.fn((_twips: number) => mkCmd()),
    setSpaceAfter: vi.fn((_twips: number) => mkCmd()),
    setIndentLeft: vi.fn((_twips: number) => mkCmd()),
    setIndentRight: vi.fn((_twips: number) => mkCmd()),
    setIndentFirstLine: vi.fn((_twips: number) => mkCmd()),
    // 对齐命令 / alignment commands（库专用，ParagraphAlignment 取值 left/center/right/both）
    alignLeft: mkCmd(),
    alignCenter: mkCmd(),
    alignRight: mkCmd(),
    alignJustify: mkCmd(),
    // 段落对齐 getter / paragraph alignment getter (Phase 3 用)
    getParagraphAlignment: vi.fn(() => null),
    // Phase 5: 修订命令 / review commands
    acceptChange: vi.fn((_from: number, _to: number) => mkCmd()),
    rejectChange: vi.fn((_from: number, _to: number) => mkCmd()),
    acceptAllChanges: vi.fn(() => mkCmd()),
    rejectAllChanges: vi.fn(() => mkCmd()),
    findNextChange: vi.fn(
      () => ({ from: 15, to: 18, type: "insertion" }) as unknown
    ),
    findPreviousChange: vi.fn(
      () => ({ from: 2, to: 4, type: "deletion" }) as unknown
    ),
  };
});
vi.mock("@eigenpal/docx-editor-core/prosemirror/commands", () => mockCmds);

// --- mock docx-editor-core PM 插件(suggestion mode = track changes)---
const mockPlugins = vi.hoisted(() => ({
  toggleSuggestionMode: vi.fn(() => true),
  isSuggestionModeActive: vi.fn(() => false),
}));
vi.mock("@eigenpal/docx-editor-core/prosemirror/plugins", () => mockPlugins);

// --- mock prosemirror-commands: 拦截 setBlockType,验证 attrs 透传 ---
const mockSetBlockType = vi.hoisted(() => vi.fn(() => vi.fn(() => true)));
vi.mock("prosemirror-commands", () => ({
  setBlockType: mockSetBlockType,
  lift: vi.fn(),
  toggleMark: vi.fn(),
  wrapIn: vi.fn(),
}));

// --- mock prosemirror-state:替换 TextSelection.create,避免构造完整 PM doc ---
// vi.mock 工厂被提升到顶部,引用的变量必须用 vi.hoisted 声明。
const mockTextSelectionCreate = vi.hoisted(() =>
  vi.fn(() => ({ from: 0, to: 0 }))
);
vi.mock("prosemirror-state", () => ({
  TextSelection: { create: mockTextSelectionCreate },
}));

// --- mock store:提供可控的 getEditorView ---
const mockDispatch = vi.fn();
const mockTr = {
  setSelection: vi.fn(() => mockTr),
  scrollIntoView: vi.fn(() => mockTr),
};
const mockView = {
  state: {
    doc: {},
    selection: { from: 5, to: 10, head: 10 },
    tr: mockTr,
    schema: {
      nodes: {
        paragraph: { name: "paragraph" },
        heading: { name: "heading" },
      },
      marks: {
        bold: { name: "bold" },
        italic: { name: "italic" },
        underline: { name: "underline" },
        strike: { name: "strike" },
        superscript: { name: "superscript" },
        subscript: { name: "subscript" },
      },
    },
  },
  dispatch: mockDispatch,
};
vi.mock("@/stores/useDocumentStore", () => ({
  useDocumentStore: {
    getState: vi.fn(() => ({
      editorBridge: { getEditorView: () => mockView },
    })),
  },
}));

import {
  applyBatch,
  execAcceptAllChanges,
  execAcceptChange,
  execClearFontFamily,
  execClearFontSize,
  execClearHighlight,
  execClearTextColor,
  execFindNextChange,
  execFindPreviousChange,
  execInsertTable,
  execRejectAllChanges,
  execRejectChange,
  execRemoveMark,
  execSetAlignment,
  execSetBlockType,
  execSetFontFamily,
  execSetFontFamilyComplete,
  execSetFontFamilyEastAsia,
  execSetFontSize,
  execSetHighlight,
  execSetIndentation,
  execSetLineSpacing,
  execSetMark,
  execSetParagraphSpacing,
  execSetTextColor,
  execToggleTrackChanges,
  isTrackChangesActive,
} from "@/features/editor/commands";
import { useDocumentStore } from "@/stores/useDocumentStore";

describe("commands — 格式命令封装", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execSetFontFamily", () => {
    it("调用 docx-editor-core setFontFamily 命令并 dispatch", () => {
      execSetFontFamily("Arial");
      expect(mockCmds.setFontFamily).toHaveBeenCalledWith("Arial");
      // setFontFamily 返回一个 Command 函数,该函数应被调用并传入 (state, dispatch)
      const cmd = mockCmds.setFontFamily.mock.results[0]?.value;
      expect(cmd).toBeDefined();
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execSetFontSize", () => {
    it("传递 half-points 值(24 = 12pt)", () => {
      execSetFontSize(24);
      expect(mockCmds.setFontSize).toHaveBeenCalledWith(24);
      const cmd = mockCmds.setFontSize.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execSetTextColor", () => {
    it("传递 { rgb } 属性对象(不带 #)", () => {
      execSetTextColor("FF0000");
      expect(mockCmds.setTextColor).toHaveBeenCalledWith({ rgb: "FF0000" });
    });

    it("自动剥离 # 前缀", () => {
      execSetTextColor("#00FF00");
      expect(mockCmds.setTextColor).toHaveBeenCalledWith({ rgb: "00FF00" });
    });
  });

  describe("execSetHighlight", () => {
    it("传递颜色名", () => {
      execSetHighlight("yellow");
      expect(mockCmds.setHighlight).toHaveBeenCalledWith("yellow");
    });
  });

  describe("execInsertTable", () => {
    it("调用 insertTable 命令并 dispatch", () => {
      execInsertTable(3, 4);
      expect(mockCmds.insertTable).toHaveBeenCalledWith(3, 4);
      const cmd = mockCmds.insertTable.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("使用默认参数 3x3", () => {
      execInsertTable();
      expect(mockCmds.insertTable).toHaveBeenCalledWith(3, 3);
    });

    it("不写入占位提示文本(回退副作用)", () => {
      mockDispatch.mockClear();
      execInsertTable();
      // 不应有 insertText 调用 —— 仅 dispatch insertTable 命令的结果
      const dispatchCalls = mockDispatch.mock.calls;
      for (const call of dispatchCalls) {
        const tr = call[0];
        // tr.insertText 是占位实现遗留;真实命令不应调用它
        expect(tr?.insertText).toBeUndefined();
      }
    });
  });
  // === Phase 3: 段落格式 / paragraph formatting ===

  describe("execSetLineSpacing", () => {
    it("调用 setLineSpacing 命令并 dispatch(倍数 1.5)", () => {
      execSetLineSpacing(1.5);
      expect(mockCmds.setLineSpacing).toHaveBeenCalledWith(1.5);
      const cmd = mockCmds.setLineSpacing.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("支持 1.0/1.15/1.5/2.0 倍数", () => {
      for (const v of [1.0, 1.15, 1.5, 2.0]) {
        mockCmds.setLineSpacing.mockClear();
        execSetLineSpacing(v);
        expect(mockCmds.setLineSpacing).toHaveBeenCalledWith(v);
      }
    });

    it("无 editor view 时静默返回(不抛错)", () => {
      // exec* 内部 getView() 返回 null 即提前 return;此处仅断言可安全调用。
      expect(() => execSetLineSpacing(1.0)).not.toThrow();
    });
  });

  describe("execSetParagraphSpacing", () => {
    it("分别调用 setSpaceBefore / setSpaceAfter(twips)", () => {
      execSetParagraphSpacing(120, 240);
      expect(mockCmds.setSpaceBefore).toHaveBeenCalledWith(120);
      expect(mockCmds.setSpaceAfter).toHaveBeenCalledWith(240);
      const beforeCmd = mockCmds.setSpaceBefore.mock.results[0]?.value;
      const afterCmd = mockCmds.setSpaceAfter.mock.results[0]?.value;
      expect(beforeCmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
      expect(afterCmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("段前为 0 仍调用 setSpaceBefore", () => {
      execSetParagraphSpacing(0, 60);
      expect(mockCmds.setSpaceBefore).toHaveBeenCalledWith(0);
      expect(mockCmds.setSpaceAfter).toHaveBeenCalledWith(60);
    });
  });

  describe("execSetIndentation", () => {
    it("仅 left 时调用 setIndentLeft", () => {
      execSetIndentation({ left: 567 });
      expect(mockCmds.setIndentLeft).toHaveBeenCalledWith(567);
      expect(mockCmds.setIndentRight).not.toHaveBeenCalled();
      expect(mockCmds.setIndentFirstLine).not.toHaveBeenCalled();
      const cmd = mockCmds.setIndentLeft.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });

    it("仅 right 时调用 setIndentRight", () => {
      execSetIndentation({ right: 567 });
      expect(mockCmds.setIndentRight).toHaveBeenCalledWith(567);
      expect(mockCmds.setIndentLeft).not.toHaveBeenCalled();
    });

    it("仅 firstLine 时调用 setIndentFirstLine", () => {
      execSetIndentation({ firstLine: 480 });
      expect(mockCmds.setIndentFirstLine).toHaveBeenCalledWith(480);
      expect(mockCmds.setIndentLeft).not.toHaveBeenCalled();
    });

    it("三参数同时设置均调用对应命令", () => {
      execSetIndentation({ left: 100, right: 200, firstLine: 300 });
      expect(mockCmds.setIndentLeft).toHaveBeenCalledWith(100);
      expect(mockCmds.setIndentRight).toHaveBeenCalledWith(200);
      expect(mockCmds.setIndentFirstLine).toHaveBeenCalledWith(300);
    });

    it("空对象时不调用任何缩进命令", () => {
      execSetIndentation({});
      expect(mockCmds.setIndentLeft).not.toHaveBeenCalled();
      expect(mockCmds.setIndentRight).not.toHaveBeenCalled();
      expect(mockCmds.setIndentFirstLine).not.toHaveBeenCalled();
    });
  });
  // === 对齐 / alignment ===
  describe("execSetAlignment", () => {
    it("left → 调用库 alignLeft 命令并 dispatch", () => {
      execSetAlignment("left");
      // alignLeft 是库导出的 Command 常量(非工厂),直接断言被以 (state, dispatch) 调用
      expect(mockCmds.alignLeft).toHaveBeenCalledWith(
        mockView.state,
        mockDispatch
      );
    });

    it("center → 调用库 alignCenter 命令并 dispatch", () => {
      execSetAlignment("center");
      expect(mockCmds.alignCenter).toHaveBeenCalledWith(
        mockView.state,
        mockDispatch
      );
    });

    it("right → 调用库 alignRight 命令并 dispatch", () => {
      execSetAlignment("right");
      expect(mockCmds.alignRight).toHaveBeenCalledWith(
        mockView.state,
        mockDispatch
      );
    });

    it("justify → 调用库 alignJustify 命令并 dispatch", () => {
      execSetAlignment("justify");
      expect(mockCmds.alignJustify).toHaveBeenCalledWith(
        mockView.state,
        mockDispatch
      );
    });

    it("仅调用对应的一个对齐命令,不串调", () => {
      execSetAlignment("center");
      expect(mockCmds.alignCenter).toHaveBeenCalled();
      expect(mockCmds.alignLeft).not.toHaveBeenCalled();
      expect(mockCmds.alignRight).not.toHaveBeenCalled();
      expect(mockCmds.alignJustify).not.toHaveBeenCalled();
    });
  });
  // === Block 类型 / block type ===
  describe("execSetBlockType", () => {
    it("heading 透传 attrs({ level }) 给 setBlockType", () => {
      execSetBlockType("heading", { level: 2 });
      expect(mockSetBlockType).toHaveBeenCalledWith(
        mockView.state.schema.nodes.heading,
        { level: 2 }
      );
    });

    it("paragraph 透传 attrs 给 setBlockType(不丢弃)", () => {
      // 隐患回归测试:paragraph 分支曾丢弃 attrs,此处守护 attrs 透传。
      execSetBlockType("paragraph", { alignment: "center" });
      expect(mockSetBlockType).toHaveBeenCalledWith(
        mockView.state.schema.nodes.paragraph,
        { alignment: "center" }
      );
    });

    it("无 attrs 时传 null 给 setBlockType", () => {
      execSetBlockType("paragraph");
      expect(mockSetBlockType).toHaveBeenCalledWith(
        mockView.state.schema.nodes.paragraph,
        null
      );
    });
  });
});

describe("commands — 审阅与打印 (Phase 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execToggleTrackChanges", () => {
    it("调用 toggleSuggestionMode 并传入 (state, dispatch)", () => {
      execToggleTrackChanges();
      expect(mockPlugins.toggleSuggestionMode).toHaveBeenCalledTimes(1);
      expect(mockPlugins.toggleSuggestionMode).toHaveBeenCalledWith(
        mockView.state,
        mockDispatch
      );
    });
  });

  describe("isTrackChangesActive", () => {
    it("调用 isSuggestionModeActive 查询当前状态", () => {
      mockPlugins.isSuggestionModeActive.mockReturnValueOnce(true);
      const result = isTrackChangesActive();
      expect(mockPlugins.isSuggestionModeActive).toHaveBeenCalledWith(
        mockView.state
      );
      expect(result).toBe(true);
    });
  });

  describe("execAcceptChange", () => {
    it("用当前选区 from/to 调用 acceptChange 并 dispatch", () => {
      execAcceptChange();
      expect(mockCmds.acceptChange).toHaveBeenCalledWith(5, 10);
      const cmd = mockCmds.acceptChange.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execRejectChange", () => {
    it("用当前选区 from/to 调用 rejectChange 并 dispatch", () => {
      execRejectChange();
      expect(mockCmds.rejectChange).toHaveBeenCalledWith(5, 10);
      const cmd = mockCmds.rejectChange.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execAcceptAllChanges", () => {
    it("调用 acceptAllChanges 并 dispatch", () => {
      execAcceptAllChanges();
      expect(mockCmds.acceptAllChanges).toHaveBeenCalledTimes(1);
      const cmd = mockCmds.acceptAllChanges.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execRejectAllChanges", () => {
    it("调用 rejectAllChanges 并 dispatch", () => {
      execRejectAllChanges();
      expect(mockCmds.rejectAllChanges).toHaveBeenCalledTimes(1);
      const cmd = mockCmds.rejectAllChanges.mock.results[0]?.value;
      expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
    });
  });

  describe("execFindNextChange", () => {
    it("从选区 head 查找下一处修订并选中、滚动可视", () => {
      execFindNextChange();
      // 查询用选区 head 作为起点
      expect(mockCmds.findNextChange).toHaveBeenCalledWith(mockView.state, 10);
      // 选中找到的范围(15..18):TextSelection.create(doc, 15, 18)
      expect(mockTextSelectionCreate).toHaveBeenCalledWith(
        mockView.state.doc,
        15,
        18
      );
      expect(mockTr.setSelection).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe("execFindPreviousChange", () => {
    it("从选区 from 查找上一处修订并选中、滚动可视", () => {
      execFindPreviousChange();
      expect(mockCmds.findPreviousChange).toHaveBeenCalledWith(
        mockView.state,
        5
      );
      // 选中找到的范围(2..4)
      expect(mockTextSelectionCreate).toHaveBeenCalledWith(
        mockView.state.doc,
        2,
        4
      );
      expect(mockTr.setSelection).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
// === execSetFontFamilyEastAsia:三字段同设测试 / three-field co-set tests ===
// 该命令使用自定义 ProseMirror 逻辑(非库 setFontFamily),需独立 mock view。
describe("execSetFontFamilyEastAsia — 三字段同设", () => {
  // 为 eastAsia 命令构建的可控 mock view
  const mkMockMark = (attrs: Record<string, unknown>) => ({
    type: { name: "fontFamily" },
    attrs,
  });
  const createMark = vi.fn((attrs: Record<string, unknown>) =>
    mkMockMark(attrs)
  );
  const markType = { name: "fontFamily", create: createMark };
  // 文本节点 mock:带可选 fontFamily mark
  const mkTextNode = (text: string, markAttrs?: Record<string, unknown>) => ({
    isText: true,
    nodeSize: text.length,
    marks: markAttrs ? [mkMockMark(markAttrs)] : [],
  });
  // 构建可控 mock view
  const buildView = (opts: {
    empty?: boolean;
    textNodes?: ReturnType<typeof mkTextNode>[];
    storedMarks?: ReturnType<typeof mkMockMark>[];
  }) => {
    const selection = opts.empty
      ? { from: 0, to: 0, empty: true }
      : { from: 0, to: 5, empty: false };
    const tr = {
      removeMark: vi.fn(() => tr),
      addMark: vi.fn(() => tr),
      setStoredMarks: vi.fn(() => tr),
    };
    const doc = {
      nodesBetween: vi.fn(
        (
          _from: number,
          _to: number,
          cb: (node: unknown, pos: number) => void
        ) => {
          for (const n of opts.textNodes ?? []) {
            cb(n, 0);
          }
        }
      ),
    };
    return {
      view: {
        state: {
          selection,
          storedMarks: opts.storedMarks ?? null,
          doc,
          schema: { marks: { fontFamily: markType } },
          tr,
        },
        dispatch: vi.fn(),
      },
      tr,
    };
  };
  // 替换 useDocumentStore 的 getEditorView 返回值
  const setView = (viewObj: unknown) => {
    vi.mocked(useDocumentStore.getState).mockReturnValue({
      editorBridge: { getEditorView: () => viewObj },
    } as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("光标(空选区):三字段同设到 storedMarks", () => {
    const { view, tr } = buildView({ empty: true, storedMarks: [] });
    setView(view);
    execSetFontFamilyEastAsia("SimHei");
    // create 被调用,attrs 含三字段
    expect(createMark).toHaveBeenCalledWith({
      ascii: "SimHei",
      hAnsi: "SimHei",
      eastAsia: "SimHei",
    });
    // setStoredMarks 被调用
    expect(tr.setStoredMarks).toHaveBeenCalled();
    expect(view.dispatch).toHaveBeenCalled();
  });

  it("选区:对每个文本节点 addMark 三字段同设", () => {
    const { view, tr } = buildView({
      empty: false,
      textNodes: [mkTextNode("hello", { ascii: "Calibri" })],
    });
    setView(view);
    execSetFontFamilyEastAsia("SimSun");
    // removeMark 先移除旧 mark
    expect(tr.removeMark).toHaveBeenCalled();
    // create 含三字段(覆盖旧 ascii)
    expect(createMark).toHaveBeenCalledWith({
      ascii: "SimSun",
      hAnsi: "SimSun",
      eastAsia: "SimSun",
    });
    // addMark 重新应用
    expect(tr.addMark).toHaveBeenCalled();
    expect(view.dispatch).toHaveBeenCalled();
  });

  it("光标处已有旧 eastAsia 字体:三字段覆盖旧值", () => {
    const { view, tr } = buildView({
      empty: true,
      storedMarks: [mkMockMark({ ascii: "Arial", eastAsia: "SimHei" })],
    });
    setView(view);
    execSetFontFamilyEastAsia("KaiTi");
    expect(createMark).toHaveBeenCalledWith({
      ascii: "KaiTi",
      hAnsi: "KaiTi",
      eastAsia: "KaiTi",
    });
    expect(tr.setStoredMarks).toHaveBeenCalled();
  });
});
// === applyBatch:单事务批量应用 / single-transaction batch apply ===
// 验证多个命令合并为单次 dispatch,且后一命令能看到前一命令的变换结果。
describe("applyBatch — 单事务批量应用", () => {
  // 构建支持 applyTransaction 累积的 mock view。
  // 关键:view.state.applyTransaction(innerTr).state 必须返回应用 innerTr 后的新 state,
  // 且累积 tr 的 steps 必须能跨命令保留。
  const buildBatchView = () => {
    const dispatchHistory: unknown[] = [];
    // 每个 step 用自增 id 标识,便于断言 step 顺序与数量
    let stepSeq = 0;
    const mkStep = () => {
      stepSeq += 1;
      return { id: stepSeq };
    };
    const mkState = (appliedSteps: unknown[]) => ({
      // appliedSteps 记录该 state 已应用的 step id,供后续命令读取
      appliedSteps,
      tr: {
        steps: [] as unknown[],
        step(step: unknown) {
          this.steps.push(step);
          return this;
        },
        get docChanged() {
          return this.steps.length > 0;
        },
      },
      applyTransaction(innerTr: { steps: unknown[] }) {
        // 模拟 PM:返回应用 innerTr 后的新 state,steps 累加
        const newApplied = [...appliedSteps, ...innerTr.steps];
        return {
          state: mkState(newApplied),
          transactions: [innerTr],
        };
      },
    });
    const initialState = mkState([]);
    const view = {
      state: initialState,
      dispatch(tr: unknown) {
        dispatchHistory.push(tr);
      },
    };
    return { view, dispatchHistory, mkStep };
  };

  const setView = (viewObj: unknown) => {
    vi.mocked(useDocumentStore.getState).mockReturnValue({
      editorBridge: { getEditorView: () => viewObj },
    } as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("两个命令合并为单次 dispatch", () => {
    const { view, dispatchHistory, mkStep } = buildBatchView();
    setView(view);
    // 两个命令各自 dispatch 一个带 1 step 的 innerTr
    const cmd1: Command = (_state, dispatch) => {
      dispatch?.({ steps: [mkStep()] } as never);
      return true;
    };
    const cmd2: Command = (_state, dispatch) => {
      dispatch?.({ steps: [mkStep()] } as never);
      return true;
    };
    applyBatch([cmd1, cmd2]);
    // 仅 dispatch 一次(单事务)
    expect(dispatchHistory).toHaveLength(1);
    // 累积 tr 含两个 step
    const dispatchedTr = dispatchHistory[0] as { steps: unknown[] };
    expect(dispatchedTr.steps).toHaveLength(2);
  });

  it("后一命令能看到前一命令的变换结果", () => {
    const { view, dispatchHistory, mkStep } = buildBatchView();
    setView(view);
    // cmd1 dispatch step A,cmd2 读取 state.appliedSteps 验证能看到 A
    let seenByCmd2: unknown[] = [];
    const cmd1: Command = (_state, dispatch) => {
      dispatch?.({ steps: [{ id: 100 }] } as never);
      return true;
    };
    const cmd2: Command = (state, dispatch) => {
      seenByCmd2 = (state as unknown as { appliedSteps: unknown[] })
        .appliedSteps;
      dispatch?.({ steps: [mkStep()] } as never);
      return true;
    };
    applyBatch([cmd1, cmd2]);
    // cmd2 看到的 state 应已包含 cmd1 的 step
    expect(seenByCmd2).toContainEqual({ id: 100 });
    expect(dispatchHistory).toHaveLength(1);
  });

  it("无 editor view 时静默返回(不抛错)", () => {
    vi.mocked(useDocumentStore.getState).mockReturnValue({
      editorBridge: { getEditorView: () => null },
    } as never);
    expect(() =>
      applyBatch([vi.fn(() => true) as unknown as Command])
    ).not.toThrow();
  });

  it("空命令数组不 dispatch", () => {
    const { view, dispatchHistory } = buildBatchView();
    setView(view);
    applyBatch([]);
    expect(dispatchHistory).toHaveLength(0);
  });

  it("命令未调用 dispatch(无可应用 step)时不 dispatch", () => {
    const { view, dispatchHistory } = buildBatchView();
    setView(view);
    // 命令返回 true 但不调 dispatch(模拟命令判定无需变更)
    const noopCmd: Command = () => true;
    applyBatch([noopCmd]);
    expect(dispatchHistory).toHaveLength(0);
  });
});
// === Phase 1: 设值/清除/字体合并命令 / set/remove/clear & font-family-merge ===
describe("execSetMark / execRemoveMark — 设值与清除 mark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置回 mockView,避免 applyBatch 测试的 setView 污染
    vi.mocked(useDocumentStore.getState).mockReturnValue({
      editorBridge: { getEditorView: () => mockView },
    } as never);
  });

  it("execSetMark 用 schema.marks 查找 markType 并调用 createSetMarkCommand", () => {
    execSetMark("bold");
    expect(mockCmds.createSetMarkCommand).toHaveBeenCalledTimes(1);
    // 第一个参数为 markType(mockView.schema.marks.bold)
    const markType = mockCmds.createSetMarkCommand.mock.calls[0][0];
    expect(markType).toBe(mockView.state.schema.marks.bold);
    // 返回的 Command 被以 (state, dispatch) 调用
    const cmd = mockCmds.createSetMarkCommand.mock.results[0].value;
    expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
  });

  it("execSetMark 透传 attrs 给 createSetMarkCommand", () => {
    execSetMark("bold", { fake: true });
    expect(mockCmds.createSetMarkCommand).toHaveBeenCalledWith(
      expect.anything(),
      { fake: true }
    );
  });

  it("execSetMark 无对应 markType 时静默返回", () => {
    expect(() => execSetMark("nonexistent")).not.toThrow();
    expect(mockCmds.createSetMarkCommand).not.toHaveBeenCalled();
  });

  it("execRemoveMark 调用 createRemoveMarkCommand 并 dispatch", () => {
    execRemoveMark("italic");
    expect(mockCmds.createRemoveMarkCommand).toHaveBeenCalledTimes(1);
    const markType = mockCmds.createRemoveMarkCommand.mock.calls[0][0];
    expect(markType).toBe(mockView.state.schema.marks.italic);
    const cmd = mockCmds.createRemoveMarkCommand.mock.results[0].value;
    expect(cmd).toHaveBeenCalledWith(mockView.state, mockDispatch);
  });

  it("execRemoveMark 无对应 markType 时静默返回", () => {
    expect(() => execRemoveMark("nonexistent")).not.toThrow();
    expect(mockCmds.createRemoveMarkCommand).not.toHaveBeenCalled();
  });
});

describe("execClearFontFamily / execClearFontSize / execClearTextColor / execClearHighlight — 清除标量属性", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置回 mockView,避免 applyBatch 测试的 setView 污染
    vi.mocked(useDocumentStore.getState).mockReturnValue({
      editorBridge: { getEditorView: () => mockView },
    } as never);
  });

  it("execClearFontFamily dispatch 库 clearFontFamily 命令", () => {
    execClearFontFamily();
    expect(mockCmds.clearFontFamily).toHaveBeenCalledWith(
      mockView.state,
      mockDispatch
    );
  });

  it("execClearFontSize dispatch 库 clearFontSize 命令", () => {
    execClearFontSize();
    expect(mockCmds.clearFontSize).toHaveBeenCalledWith(
      mockView.state,
      mockDispatch
    );
  });

  it("execClearTextColor dispatch 库 clearTextColor 命令", () => {
    execClearTextColor();
    expect(mockCmds.clearTextColor).toHaveBeenCalledWith(
      mockView.state,
      mockDispatch
    );
  });

  it("execClearHighlight dispatch 库 clearHighlight 命令", () => {
    execClearHighlight();
    expect(mockCmds.clearHighlight).toHaveBeenCalledWith(
      mockView.state,
      mockDispatch
    );
  });
});

// === execSetFontFamilyComplete:对象合并测试 / object-merge tests ===
// 验证只覆盖传入字段,保留其他字段(与 execSetFontFamilyEastAsia 三字段同设不同)。
describe("execSetFontFamilyComplete — 字段合并(只覆盖传入字段)", () => {
  // 复用 eastAsia 测试的 mock 模式;markType 先声明,使 mkMockMark 的 type 引用一致
  // (实现用 m.type === markType 引用相等查找旧 mark,故 mock 必须共用同一引用)
  const createMark = vi.fn((attrs: Record<string, unknown>) => ({
    type: markType,
    attrs,
  }));
  const markType = { name: "fontFamily", create: createMark };
  const mkMockMark = (attrs: Record<string, unknown>) => ({
    type: markType,
    attrs,
  });
  const mkTextNode = (text: string, markAttrs?: Record<string, unknown>) => ({
    isText: true,
    nodeSize: text.length,
    marks: markAttrs ? [mkMockMark(markAttrs)] : [],
  });
  const buildView = (opts: {
    empty?: boolean;
    textNodes?: ReturnType<typeof mkTextNode>[];
    storedMarks?: ReturnType<typeof mkMockMark>[];
  }) => {
    const selection = opts.empty
      ? { from: 0, to: 0, empty: true }
      : { from: 0, to: 5, empty: false };
    const tr = {
      removeMark: vi.fn(() => tr),
      addMark: vi.fn(() => tr),
      setStoredMarks: vi.fn(() => tr),
    };
    const doc = {
      nodesBetween: vi.fn(
        (
          _from: number,
          _to: number,
          cb: (node: unknown, pos: number) => void
        ) => {
          for (const n of opts.textNodes ?? []) {
            cb(n, 0);
          }
        }
      ),
    };
    return {
      view: {
        state: {
          selection,
          storedMarks: opts.storedMarks ?? null,
          doc,
          schema: { marks: { fontFamily: markType } },
          tr,
        },
        dispatch: vi.fn(),
      },
      tr,
    };
  };
  const setView = (viewObj: unknown) => {
    vi.mocked(useDocumentStore.getState).mockReturnValue({
      editorBridge: { getEditorView: () => viewObj },
    } as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("选区:合并 ascii+hAnsi,保留旧 eastAsia", () => {
    const { view, tr } = buildView({
      empty: false,
      textNodes: [mkTextNode("hello", { ascii: "Arial", eastAsia: "SimSun" })],
    });
    setView(view);
    execSetFontFamilyComplete({ ascii: "Calibri", hAnsi: "Calibri" });
    expect(tr.removeMark).toHaveBeenCalled();
    // createMark 收到合并后的 attrs:ascii/hAnsi 被覆盖,eastAsia 保留
    expect(createMark).toHaveBeenCalledWith({
      ascii: "Calibri",
      hAnsi: "Calibri",
      eastAsia: "SimSun",
    });
    expect(tr.addMark).toHaveBeenCalled();
    expect(view.dispatch).toHaveBeenCalled();
  });

  it("选区:仅设 eastAsia,保留旧 ascii", () => {
    const { view } = buildView({
      empty: false,
      textNodes: [mkTextNode("hello", { ascii: "Arial", hAnsi: "Arial" })],
    });
    setView(view);
    execSetFontFamilyComplete({ eastAsia: "SimHei" });
    expect(createMark).toHaveBeenCalledWith({
      ascii: "Arial",
      hAnsi: "Arial",
      eastAsia: "SimHei",
    });
  });

  it("选区:三字段同时设置,结果完整", () => {
    const { view } = buildView({
      empty: false,
      textNodes: [
        mkTextNode("hello", { ascii: "Calibri", eastAsia: "SimSun" }),
      ],
    });
    setView(view);
    execSetFontFamilyComplete({
      ascii: "Arial",
      hAnsi: "Arial",
      eastAsia: "SimHei",
    });
    expect(createMark).toHaveBeenCalledWith({
      ascii: "Arial",
      hAnsi: "Arial",
      eastAsia: "SimHei",
    });
  });

  it("光标(空选区):合并进 storedMarks", () => {
    const { view, tr } = buildView({
      empty: true,
      storedMarks: [mkMockMark({ ascii: "Arial", eastAsia: "SimSun" })],
    });
    setView(view);
    execSetFontFamilyComplete({ ascii: "Calibri", hAnsi: "Calibri" });
    expect(createMark).toHaveBeenCalledWith({
      ascii: "Calibri",
      hAnsi: "Calibri",
      eastAsia: "SimSun",
    });
    expect(tr.setStoredMarks).toHaveBeenCalled();
    expect(view.dispatch).toHaveBeenCalled();
  });

  it("无 fontFamily markType 时静默返回", () => {
    const view = {
      state: {
        selection: { from: 0, to: 0, empty: true },
        storedMarks: null,
        doc: { nodesBetween: vi.fn() },
        schema: { marks: {} },
        tr: {},
      },
      dispatch: vi.fn(),
    };
    setView(view);
    expect(() => execSetFontFamilyComplete({ ascii: "Arial" })).not.toThrow();
  });
});
