// raven-docx/hexId.test.ts — paraId 生成器单元测试
// 逐字复制自 @eigenpal/docx-editor-core/src/utils/hexId.ts
// Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.1 第4点、§3.2.4

import { describe, expect, it } from "vitest";
import { generateHexId, isValidLongHexId, MAX_HEX_ID_EXCLUSIVE } from "./hexId";

// 顶层 regex：避免循环内重复编译（biome useTopLevelRegex）
const HEX_ID_RE = /^[0-9A-F]{8}$/;

describe("MAX_HEX_ID_EXCLUSIVE", () => {
  it("等于 ST_LongHexNumber 最严格上限 0x7FFFFFFF", () => {
    expect(MAX_HEX_ID_EXCLUSIVE).toBe(0x7f_ff_ff_ff);
  });
});

describe("generateHexId", () => {
  it("始终产出 8 位大写 hex", () => {
    for (let i = 0; i < 1000; i += 1) {
      const id = generateHexId();
      expect(HEX_ID_RE.test(id)).toBe(true);
    }
  });

  it("永不产出 >= 0x80000000 的值（ST_LongHexNumber 上限）", () => {
    for (let i = 0; i < 5000; i += 1) {
      const value = Number.parseInt(generateHexId(), 16);
      expect(value).toBeLessThan(0x80_00_00_00);
    }
  });

  it("左侧补零", () => {
    // 概率上小值必然出现；mock Math.random 确定性验证补零
    const original = Math.random;
    Math.random = () => 0; // → 0 → "0" → padStart → "00000000"
    try {
      expect(generateHexId()).toBe("00000000");
    } finally {
      Math.random = original;
    }
  });

  it("最坏情况 Math.random 上限仍 < 0x7FFFFFFF（durableId 上限）", () => {
    const original = Math.random;
    Math.random = () => 1 - Number.EPSILON;
    try {
      const value = Number.parseInt(generateHexId(), 16);
      expect(value).toBeLessThan(0x7f_ff_ff_ff);
    } finally {
      Math.random = original;
    }
  });
});

describe("isValidLongHexId", () => {
  it("接受上限内的 8 位 hex", () => {
    expect(isValidLongHexId("0000ABCD")).toBe(true);
    expect(isValidLongHexId("7FFFFFFE")).toBe(true);
  });

  it("拒绝 >= 0x7FFFFFFF 的值", () => {
    expect(isValidLongHexId("7FFFFFFF")).toBe(false); // == cap
    expect(isValidLongHexId("F2345678")).toBe(false); // > cap
  });

  it("拒绝非 8 位或非 hex", () => {
    expect(isValidLongHexId("ABCD")).toBe(false); // 太短
    expect(isValidLongHexId("GHIJKLMN")).toBe(false); // 非 hex
    expect(isValidLongHexId(undefined)).toBe(false);
  });
});
