// raven-docx/hexId.ts — paraId 生成器
// 逐字复制自 @eigenpal/docx-editor-core/src/utils/hexId.ts
// 该函数是 core 内部工具，未从任何 public 包导出，无法 import。
// Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.1 第4点

/**
 * Strictest OOXML `ST_LongHexNumber` upper bound (exclusive) across the
 * fields this helper feeds: `w14:paraId` / `w14:textId` / comment
 * `paraId` (`< 0x80000000`) and `w16cid:commentId/@durableId`
 * (`< 0x7FFFFFFF`). Generated ids must stay strictly below this value
 * to survive both Word ("Document Recovery — Table Properties") and
 * strict OOXML validators.
 */
export const MAX_HEX_ID_EXCLUSIVE = 0x7f_ff_ff_ff;

/**
 * Random 8-char uppercase hex id, matching Microsoft's `w14:paraId`
 * extension format (also reused for comment `paraId` / `durableId`).
 *
 * Range is `[0, MAX_HEX_ID_EXCLUSIVE)` = `[0, 0x7FFFFFFE]`. See
 * `MAX_HEX_ID_EXCLUSIVE` for why this exact bound.
 *
 * Uses `Math.random()` rather than `crypto.randomUUID()` so the
 * generator works in non-secure contexts (file://, web workers).
 */
export function generateHexId(): string {
  return Math.floor(Math.random() * MAX_HEX_ID_EXCLUSIVE)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
}

const LONG_HEX_ID_RE = /^[0-9A-Fa-f]{8}$/;

/** True for an 8-hex `ST_LongHexNumber` strictly below {@link MAX_HEX_ID_EXCLUSIVE}. */
export function isValidLongHexId(id: string | undefined): boolean {
  if (!(id && LONG_HEX_ID_RE.test(id))) {
    return false;
  }
  return Number.parseInt(id, 16) < MAX_HEX_ID_EXCLUSIVE;
}
