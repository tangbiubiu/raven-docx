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
  | "tool_execution"
  | "agent_end"
  | "error";

/**
 * pi agent 事件载荷类型映射
 */
export type PiEventPayloads = {
  text_delta: { text: string };
  tool_call: { name: string; args: object };
  tool_result: { name: string; result: object };
  tool_execution: { toolName: string; isError: boolean };
  agent_end: { documentDirty: boolean };
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
 * Tauri 窗口关闭请求事件。
 * 调用 `preventDefault()` 阻止窗口关闭。
 */
export type CloseRequestedEvent = {
  preventDefault(): void;
};

/**
 * 监听 Tauri 窗口关闭请求。
 * 回调中可执行异步保存操作；调用 `event.preventDefault()` 阻止关闭。
 *
 * @example
 * ```ts
 * const unlisten = await onCloseRequested(async (event) => {
 *   if (isDirty) {
 *     event.preventDefault();
 *     // 弹确认对话框...
 *   }
 * });
 * ```
 */
export async function onCloseRequested(
  callback: (event: CloseRequestedEvent) => Promise<void>
): Promise<UnlistenFn> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow().onCloseRequested(
    (event: { preventDefault: () => void }) =>
      callback({ preventDefault: () => event.preventDefault() })
  );
}
