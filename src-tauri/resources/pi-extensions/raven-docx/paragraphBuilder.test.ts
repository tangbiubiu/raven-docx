// raven-docx/paragraphBuilder.test.ts — 段落构造与 revisionId 扫描单元测试
// Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.2、§3.2.4
// Reference: .dev/plan/2026-06-29-insert-paragraph-table-crash-fix.md §3.5

import { describe, expect, it } from "vitest";
import {
  buildInsertedParagraph,
  type BlockContent,
  type BlockSdt,
  type DocumentBody,
  findParagraphIndex,
  generateUniqueParaId,
  nextRevisionId,
  type Paragraph,
  type Table,
} from "./paragraphBuilder";

// ---- 最小 mock：只构造扫描所需的字段 ----
function mkPara(opts: {
  paraId?: string;
  content?: Paragraph["content"];
}): Paragraph {
  return {
    type: "paragraph",
    paraId: opts.paraId,
    content: opts.content ?? [
      { type: "run", content: [{ type: "text", text: "x" }] },
    ],
  };
}
function mkBody(content: BlockContent[]): DocumentBody {
  return { content };
}

// 表格 helper：rows × cells，每 cell 含若干 block（paragraph 或嵌套 block）
function mkTable(rows: Array<Array<BlockContent[]>>): Table {
  return {
    type: "table",
    rows: rows.map((cells) => ({
      cells: cells.map((content) => ({ content })),
    })),
  };
}

// blockSdt helper：content 为嵌套 BlockContent[]
function mkBlockSdt(content: BlockContent[]): BlockSdt {
  return { type: "blockSdt", content };
}

describe("buildInsertedParagraph", () => {
  const baseInfo = {
    author: "Raven Agent",
    revisionId: 42,
    date: "2026-06-27T00:00:00Z",
  };

  it("构造带 styleId 的标题段落，tracked insertion 形状正确", () => {
    const para = buildInsertedParagraph({
      text: "技术方案",
      styleId: "Heading2",
      paraId: "0000ABCD",
      ...baseInfo,
    });
    expect(para.type).toBe("paragraph");
    expect(para.paraId).toBe("0000ABCD");
    expect(para.formatting).toEqual({ styleId: "Heading2" });
    expect(para.pPrIns).toEqual({
      id: 42,
      author: "Raven Agent",
      date: "2026-06-27T00:00:00Z",
    });
    expect(para.content).toHaveLength(1);
    const insertion = para.content[0];
    expect(insertion.type).toBe("insertion");
    expect(insertion.info).toEqual({
      id: 42,
      author: "Raven Agent",
      date: "2026-06-27T00:00:00Z",
    });
    if (insertion.type !== "insertion") {
      throw new Error("expected insertion");
    }
    expect(insertion.content).toHaveLength(1);
    expect(insertion.content[0].type).toBe("run");
    expect(insertion.content[0].content[0]).toEqual({
      type: "text",
      text: "技术方案",
    });
  });

  it("省略 styleId 时 formatting 为空对象", () => {
    const para = buildInsertedParagraph({
      text: "正文段落",
      paraId: "00000001",
      ...baseInfo,
    });
    expect(para.formatting).toEqual({});
  });

  it("date 省略时 pPrIns/Insertion.info 不含 date 字段", () => {
    const para = buildInsertedParagraph({
      text: "t",
      paraId: "00000002",
      author: "a",
      revisionId: 1,
    });
    expect(para.pPrIns).toEqual({ id: 1, author: "a" });
    if (para.content[0].type !== "insertion") {
      throw new Error("expected insertion");
    }
    expect(para.content[0].info).toEqual({ id: 1, author: "a" });
  });

  it("空文本仍构造合法段落结构", () => {
    const para = buildInsertedParagraph({
      text: "",
      paraId: "00000003",
      ...baseInfo,
    });
    if (para.content[0].type !== "insertion") {
      throw new Error("expected insertion");
    }
    expect(para.content[0].content[0].content[0]).toEqual({
      type: "text",
      text: "",
    });
  });
});

describe("nextRevisionId", () => {
  it("空 body 返回 1", () => {
    expect(nextRevisionId(mkBody([]))).toBe(1);
  });

  it("无 tracked change 的 body 返回 1", () => {
    const body = mkBody([
      mkPara({ paraId: "00000001" }),
      mkPara({ paraId: "00000002" }),
    ]);
    expect(nextRevisionId(body)).toBe(1);
  });

  it("扫描 body 内 Insertion/Deletion 的 info.id 取 max+1", () => {
    const body = mkBody([
      mkPara({
        paraId: "00000001",
        content: [
          { type: "insertion", info: { id: 5, author: "a" }, content: [] },
          { type: "deletion", info: { id: 12, author: "a" }, content: [] },
        ],
      }),
      mkPara({
        paraId: "00000002",
        content: [
          { type: "insertion", info: { id: 8, author: "a" }, content: [] },
        ],
      }),
    ]);
    expect(nextRevisionId(body)).toBe(13);
  });

  it("WeakMap 缓存：连续调用每次 +2（预留 replacement 双 id 间隔）", () => {
    const body = mkBody([
      mkPara({
        paraId: "00000001",
        content: [
          { type: "insertion", info: { id: 99, author: "a" }, content: [] },
        ],
      }),
    ]);
    expect(nextRevisionId(body)).toBe(100);
    expect(nextRevisionId(body)).toBe(102);
    expect(nextRevisionId(body)).toBe(104);
  });

  it("不同 body 独立缓存", () => {
    const bodyA = mkBody([
      mkPara({
        paraId: "00000001",
        content: [
          { type: "insertion", info: { id: 10, author: "a" }, content: [] },
        ],
      }),
    ]);
    const bodyB = mkBody([
      mkPara({
        paraId: "00000002",
        content: [
          { type: "insertion", info: { id: 20, author: "a" }, content: [] },
        ],
      }),
    ]);
    expect(nextRevisionId(bodyA)).toBe(11);
    expect(nextRevisionId(bodyB)).toBe(21);
  });
});

describe("nextRevisionId — 表格文档", () => {
  it("body 含 table block 不崩溃，返回 1（无 tracked change）", () => {
    const body = mkBody([
      mkPara({ paraId: "00000001" }),
      mkTable([[[mkPara({ paraId: "00000002" })]]]),
      mkPara({ paraId: "00000003" }),
    ]);
    expect(nextRevisionId(body)).toBe(1);
  });

  it("扫描 table cell 内 Insertion/Deletion 的 info.id", () => {
    const body = mkBody([
      mkPara({ paraId: "00000001" }),
      mkTable([
        [
          [
            mkPara({
              paraId: "00000002",
              content: [
                {
                  type: "insertion",
                  info: { id: 99, author: "a" },
                  content: [],
                },
              ],
            }),
          ],
        ],
      ]),
    ]);
    expect(nextRevisionId(body)).toBe(100);
  });

  it("body 含 blockSdt block 不崩溃", () => {
    const body = mkBody([
      mkPara({ paraId: "00000001" }),
      mkBlockSdt([mkPara({ paraId: "00000002" })]),
      mkPara({ paraId: "00000003" }),
    ]);
    expect(nextRevisionId(body)).toBe(1);
  });
});

describe("findParagraphIndex — 表格文档", () => {
  it("top-level paragraph paraId 定位 + insertPos 指向其后", () => {
    const body = mkBody([
      mkPara({ paraId: "0A423B0E" }),
      mkTable([[[mkPara({ paraId: "16AF244C" })]]]),
      mkPara({ paraId: "5C2A2B25" }),
    ]);
    const found = findParagraphIndex(body, "0A423B0E");
    expect(found).not.toBeNull();
    expect(found!.location).toBe("top-level");
    expect(found!.insertPos).toBe(1);
    expect(found!.para.paraId).toBe("0A423B0E");
  });

  it("table cell 内 paraId 定位，location=table-cell", () => {
    const body = mkBody([
      mkPara({ paraId: "0A423B0E" }),
      mkTable([[[mkPara({ paraId: "16AF244C" })]]]),
    ]);
    const found = findParagraphIndex(body, "16AF244C");
    expect(found).not.toBeNull();
    expect(found!.location).toBe("table-cell");
    expect(found!.para.paraId).toBe("16AF244C");
  });

  it("document-wide index fallback（paraId-less paragraph）", () => {
    const body = mkBody([
      mkPara({ paraId: undefined }),
      mkTable([[[mkPara({ paraId: undefined })]]]),
    ]);
    const found0 = findParagraphIndex(body, "0");
    expect(found0!.para).toBe(body.content[0]);
    const found1 = findParagraphIndex(body, "1");
    expect(found1!.location).toBe("table-cell");
  });

  it("不存在的 paraId 返回 null", () => {
    const body = mkBody([mkPara({ paraId: "0A423B0E" })]);
    expect(findParagraphIndex(body, "DEADBEEF")).toBeNull();
  });

  it("blockSdt 不递归其 content（对齐上游）", () => {
    const body = mkBody([
      mkBlockSdt([mkPara({ paraId: "INSIDE_SDT" })]),
      mkPara({ paraId: "AFTER_SDT" }),
    ]);
    expect(findParagraphIndex(body, "INSIDE_SDT")).toBeNull();
    expect(findParagraphIndex(body, "1")?.para.paraId).toBe("AFTER_SDT");
  });
});

describe("generateUniqueParaId — 表格文档", () => {
  it("body 含 table 不崩溃", () => {
    const body = mkBody([
      mkPara({ paraId: "00000001" }),
      mkTable([[[mkPara({ paraId: "00000002" })]]]),
    ]);
    expect(() => generateUniqueParaId(body)).not.toThrow();
  });
});
