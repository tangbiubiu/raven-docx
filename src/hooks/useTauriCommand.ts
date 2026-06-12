// hooks/useTauriCommand.ts — Tauri command 调用封装 (Tauri Command Wrapper)
// 统一处理 tauri-specta Result<T, E> 的错误状态
// Reference: .dev/docs/modules/infrastructure.md §4

import { logger } from "@/lib/logger";

/**
 * 调用 Tauri command 并提取 data。
 * 自动检查 `result.status`，失败时抛出 Error。
 *
 * @param commandName - 命令名（用于日志）
 * @param fn - tauri-specta 生成的调用函数
 * @returns Promise<T> — 成功时返回 data
 * @throws Error — 失败时抛出 error
 *
 * @example
 * ```ts
 * import { greet } from "@/lib/bindings";
 * const data = await callTauriCommand("greet", () => greet("World"));
 * ```
 */
export async function callTauriCommand<T>(
  commandName: string,
  fn: () => Promise<
    { status: "ok"; data: T } | { status: "error"; error: string }
  >
): Promise<T> {
  logger.debug(`Calling Tauri command: ${commandName}`);

  const result = await fn();

  if (result.status === "error") {
    logger.error(`Tauri command '${commandName}' failed: ${result.error}`);
    throw new Error(result.error);
  }

  return result.data;
}

/**
 * 调用 Tauri command（无返回值版本）。
 * 与 `callTauriCommand` 相同，但不返回 data。
 *
 * @example
 * ```ts
 * await callTauriCommandVoid("save_docx", () => saveDocx(path, buffer));
 * ```
 */
export async function callTauriCommandVoid(
  commandName: string,
  fn: () => Promise<
    { status: "ok"; data: null } | { status: "error"; error: string }
  >
): Promise<void> {
  await callTauriCommand<null>(commandName, fn);
}
