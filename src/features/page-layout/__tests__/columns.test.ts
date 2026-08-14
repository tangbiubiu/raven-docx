// features/page-layout/__tests__/columns.test.ts — 分栏数据模型直改测试
import { createEmptyDocument, serializeDocx } from "@eigenpal/docx-editor-core";
import { describe, expect, it } from "vitest";
import { applyColumnsToDoc } from "../columns";

describe("applyColumnsToDoc", () => {
  it("设置 2 栏等宽并序列化出 w:cols", () => {
    const doc = createEmptyDocument();
    applyColumnsToDoc(doc, { columnCount: 2 });
    const sect = doc.package.document.finalSectionProperties;
    expect(sect?.columnCount).toBe(2);
    expect(sect?.equalWidth).toBe(true);
    expect(sect?.columnSpace).toBe(425);
    expect(sect?.columns).toBeUndefined();
    const xml = serializeDocx(doc);
    expect(xml).toContain('<w:cols w:num="2"');
  });

  it("columnCount=1 还原单栏(无列定义/分隔线)", () => {
    const doc = createEmptyDocument();
    applyColumnsToDoc(doc, { columnCount: 1 });
    const sect = doc.package.document.finalSectionProperties;
    expect(sect?.columnCount).toBe(1);
    expect(sect?.columns).toBeUndefined();
    expect(sect?.separator).toBe(false);
  });

  it("不等宽时生成显式列宽", () => {
    const doc = createEmptyDocument();
    applyColumnsToDoc(doc, {
      columnCount: 3,
      equalWidth: false,
      separator: true,
    });
    const sect = doc.package.document.finalSectionProperties;
    expect(sect?.columns).toHaveLength(3);
    for (const col of sect?.columns ?? []) {
      expect(col.width ?? 0).toBeGreaterThan(0);
    }
    expect(sect?.separator).toBe(true);
  });
});
