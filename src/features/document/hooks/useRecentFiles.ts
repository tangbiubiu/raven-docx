// features/document/hooks/useRecentFiles.ts — 最近文件列表 (Recent Files)
// 管理最近打开的文件路径列表，持久化到 localStorage
// Reference: .dev/plan/implementation-plan.md §Phase 2.3

const STORAGE_KEY = "geex-docx:recent-files";
const MAX_FILES = 10;

/** 获取最近文件列表 */
export function getRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}

/** 添加文件到最近列表（去重，移到头部，最多 MAX_FILES 条） */
export function addRecentFile(path: string): void {
  const files = getRecentFiles().filter((f) => f !== path);
  files.unshift(path);
  const trimmed = files.slice(0, MAX_FILES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage 不可用时静默失败
  }
}

/** 清空最近文件列表 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 静默失败
  }
}
