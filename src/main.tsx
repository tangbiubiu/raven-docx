import { attachConsole } from "@tauri-apps/plugin-log";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import App from "./app";
import { logger } from "./lib/logger";
import "./index.css";

// Attach Rust logs to browser console in development mode
if (import.meta.env.DEV) {
  attachConsole();
}

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center p-4" role="alert">
      <div className="text-center">
        <h1 className="mb-2 font-semibold text-xl">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          className="mt-4 text-primary text-sm underline"
          onClick={resetErrorBoundary}
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        const contextStr = ` Context: ${JSON.stringify({ errorInfo })}`;
        logger.error(
          `Error: ${error.message}${contextStr}\nStack: ${error.stack}`
        );
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
