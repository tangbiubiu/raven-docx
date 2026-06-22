// features/agent/hooks/__tests__/useAgentSession.test.ts
// computeDocHash 单元测试 — 确保生成的 session-id 符合 pi 字符集约束
// pi 要求 session-id: 仅 [a-zA-Z0-9._-]，且以字母数字开头/结尾

import { describe, expect, it } from "vitest";
import { computeDocHash } from "../useAgentSession";

// pi session-id 合法字符集：字母、数字、'-'、'_'、'.'，首尾须为字母数字
const SESSION_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
const LEGAL_CHARS_RE = /^[a-zA-Z0-9._-]+$/;

describe("computeDocHash — session-id 合法性", () => {
  it("返回非空字符串", async () => {
    const hash = await computeDocHash("/path/to/doc.docx");
    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThan(0);
  });

  it("仅含合法字符 [a-zA-Z0-9._-]", async () => {
    const hash = await computeDocHash("/Users/test/Desktop/report.docx");
    expect(hash).toMatch(LEGAL_CHARS_RE);
  });

  it("首尾为字母数字", async () => {
    const hash = await computeDocHash("/Users/test/Desktop/report.docx");
    expect(hash).toMatch(SESSION_ID_RE);
  });

  it("不包含路径分隔符 / 或反斜杠", async () => {
    const hash = await computeDocHash("/Users/test/Desktop/report.docx");
    expect(hash).not.toContain("/");
    expect(hash).not.toContain("\\");
  });

  it("相同路径产生相同 hash（确定性）", async () => {
    const path = "/Users/biubiu/Desktop/周报.docx";
    const hash1 = await computeDocHash(path);
    const hash2 = await computeDocHash(path);
    expect(hash1).toBe(hash2);
  });

  it("不同路径产生不同 hash", async () => {
    const hash1 = await computeDocHash("/path/a.docx");
    const hash2 = await computeDocHash("/path/b.docx");
    expect(hash1).not.toBe(hash2);
  });

  it("中文路径也能生成合法 session-id", async () => {
    const hash = await computeDocHash(
      "/Users/biubiu/Desktop/周报-20260529-唐禹.docx"
    );
    expect(hash).toMatch(SESSION_ID_RE);
  });

  it("不再直接返回原始路径", async () => {
    const path = "/Users/test/Desktop/report.docx";
    const hash = await computeDocHash(path);
    expect(hash).not.toBe(path);
  });
});
