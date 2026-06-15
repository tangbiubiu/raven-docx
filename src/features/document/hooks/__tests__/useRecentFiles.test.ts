// features/document/hooks/__tests__/useRecentFiles.test.ts — 最近文件 hook 测试
// Reference: .dev/plan/implementation-plan.md §Phase 2.3

import { beforeEach, describe, expect, it } from "vitest";
import { addRecentFile, clearRecentFiles, getRecentFiles } from "../useRecentFiles";

describe("useRecentFiles", () => {
  beforeEach(() => {
    clearRecentFiles();
  });

  it("初始列表为空", () => {
    expect(getRecentFiles()).toEqual([]);
  });

  it("addRecentFile 添加文件到列表头部", () => {
    addRecentFile("/tmp/file1.docx");
    addRecentFile("/tmp/file2.docx");

    const files = getRecentFiles();
    expect(files).toEqual(["/tmp/file2.docx", "/tmp/file1.docx"]);
  });

  it("addRecentFile 对已存在的文件去重并将其移到头部", () => {
    addRecentFile("/tmp/file1.docx");
    addRecentFile("/tmp/file2.docx");
    addRecentFile("/tmp/file1.docx"); // 再次添加

    const files = getRecentFiles();
    expect(files).toEqual(["/tmp/file1.docx", "/tmp/file2.docx"]);
  });

  it("addRecentFile 最多保留 10 条", () => {
    for (let i = 0; i < 15; i++) {
      addRecentFile(`/tmp/file${i}.docx`);
    }

    const files = getRecentFiles();
    expect(files.length).toBe(10);
    expect(files[0]).toBe("/tmp/file14.docx");
  });

  it("clearRecentFiles 清空列表", () => {
    addRecentFile("/tmp/file1.docx");
    clearRecentFiles();

    expect(getRecentFiles()).toEqual([]);
  });

  it("返回最近打开顺序", () => {
    addRecentFile("/tmp/a.docx");
    addRecentFile("/tmp/b.docx");
    addRecentFile("/tmp/c.docx");

    const files = getRecentFiles();
    expect(files).toEqual(["/tmp/c.docx", "/tmp/b.docx", "/tmp/a.docx"]);
  });
});
