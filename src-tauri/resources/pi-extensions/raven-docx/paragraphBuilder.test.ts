// raven-docx/paragraphBuilder.test.ts — 段落构造与 revisionId 扫描单元测试
// Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.2、§3.2.4

import { describe, expect, it } from "vitest";
import {
  buildInsertedParagraph,
  type DocumentBody,
  nextRevisionId,
  type Paragraph,
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
function mkBody(content: Paragraph[]): DocumentBody {
  return { content };
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
    // 段落标记 tracked insertion
    expect(para.pPrIns).toEqual({
      id: 42,
      author: "Raven Agent",
      date: "2026-06-27T00:00:00Z",
    });
    // 内容是单个 Insertion wrapper，内含一个 run→text
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
    expect(nextRevisionId(body)).toBe(13); // max(5,12,8)+1
  });

  it("WeakMap 缓存：连续调用每次 +2（预留 replacement 双 id 间隔）", () => {
    // 首次扫描 max=99 → 返回 100，缓存设为 101
    // 后续读缓存：101→返回102缓存103、103→返回104缓存105
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
