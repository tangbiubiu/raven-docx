// lib/tauri-events.ts — Tauri 事件监听封装 (Tauri Event Listeners)
// 提供类型安全的 pi agent 事件和窗口关闭事件监听
// Reference: .dev/docs/modules/infrastructure.md §3

import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * pi agent 事件类型
 */
export type PiEventType =
  | "text_delta"
  | "tool_call"
  | "tool_result"
  | "agent_end"
  | "error";

/**
 * pi agent 事件载荷类型映射
 */
export type PiEventPayloads = {
  text_delta: { text: string };
  tool_call: { name: string; args: object };
  tool_result: { name: string; result: object };
  agent_end: Record<string, never>;
  error: { message: string };
};

/**
 * 监听 pi agent 事件。
 * 返回 `UnlistenFn`，调用即可取消监听。
 *
 * @example
 * ```ts
 * const unlisten = await onPiEvent("text_delta", (payload) => {
 *   console.log(payload.text);
 * });
 * // 取消监听
 * unlisten();
 * ```
 */
export function onPiEvent<T extends PiEventType>(
  type: T,
  callback: (payload: PiEventPayloads[T]) => void
): Promise<UnlistenFn> {
  return listen<PiEventPayloads[T]>(`pi:${type}`, (event) => {
    callback(event.payload);
  });
}

/**
 * 监听 Tauri 窗口关闭请求。
 * 回调中可执行异步保存操作，Tauri 会等待 Promise resolve。
 *
 * @example
 * ```ts
 * onCloseRequested(async () => {
 *   if (isDirty) await saveDocument();
 * });
 * ```
 */
export function onCloseRequested(
  callback: () => Promise<void>
): Promise<UnlistenFn> {
  return listen("tauri://close-requested", async () => {
    await callback();
  });
}
