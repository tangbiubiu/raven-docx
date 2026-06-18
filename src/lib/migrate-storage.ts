// lib/migrate-storage.ts — localStorage 键迁移（geex-docx → raven）
// 在应用启动时调用，将旧版 localStorage 键迁移到新键名。
// 幂等：如果新键已存在则跳过。

const MIGRATION_KEY = "raven:storage-migrated";

/** 旧键 → 新键映射表 */
const KEY_MAPPINGS: [string, string][] = [
  ["geex-docx:draft", "raven:draft"],
  ["geex-docx:recent-files", "raven:recent-files"],
  ["geex-docx:settings", "raven:settings"],
  ["geex-docx-theme", "raven-theme"],
];

/**
 * 迁移旧版 localStorage 键到新键名。
 * 仅在首次运行时执行（通过 raven:storage-migrated 标记判断）。
 */
export function migrateLocalStorage(): void {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) {
      return; // 已迁移过
    }

    let migrated = 0;
    for (const [oldKey, newKey] of KEY_MAPPINGS) {
      const value = localStorage.getItem(oldKey);
      if (value !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
        migrated += 1;
      }
    }

    if (migrated > 0) {
      console.info(`[migrate] localStorage 迁移完成: ${migrated} 个键`);
    }

    localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
  } catch {
    // localStorage 不可用时静默失败
  }
}
