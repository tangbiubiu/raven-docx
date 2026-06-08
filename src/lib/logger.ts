import { debug, error, info, trace, warn } from "@tauri-apps/plugin-log";

export const logger = {
  trace,
  debug,
  info,
  warn,
  error,
};

// Helper to log errors with context
export function logError(err: Error, context?: Record<string, unknown>) {
  const contextStr = context ? ` Context: ${JSON.stringify(context)}` : "";
  error(`Error: ${err.message}${contextStr}\nStack: ${err.stack}`);
}
