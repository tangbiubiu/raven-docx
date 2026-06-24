// src/features/ribbon/components/RibbonErrorBoundary.tsx — 标签页级错误边界 / Per-tab error boundary
// Phase 7.3: 包裹每个标签页，崩溃时显示 fallback UI + 错误报告，避免单个标签页崩溃拖垮整个 Ribbon。

import { ErrorBoundary } from "react-error-boundary";
import { useT } from "@/lib/i18n";
import { logger } from "@/lib/logger";

/** 标签页崩溃时的 fallback UI */
function TabFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const { t } = useT();
  return (
    <div
      className="flex h-full w-full items-center justify-center p-2 text-center"
      role="alert"
    >
      <div>
        <p className="font-medium text-destructive text-xs">
          {t("ribbon.error.title")}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {error.message || t("ribbon.error.default")}
        </p>
        <button
          className="mt-1 text-[10px] text-primary underline"
          onClick={resetErrorBoundary}
          type="button"
        >
          {t("ribbon.error.retry")}
        </button>
      </div>
    </div>
  );
}

/** 包裹单个标签页内容，隔离崩溃 */
export function RibbonErrorBoundary({
  tabId,
  children,
}: {
  tabId: string;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={TabFallback}
      onError={(error, errorInfo) => {
        logger.error(
          `Ribbon tab "${tabId}" crashed: ${error.message}\nStack: ${error.stack}\nInfo: ${JSON.stringify(errorInfo)}`
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
