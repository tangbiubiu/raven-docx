import "@testing-library/jest-dom/vitest";
import { randomFillSync } from "node:crypto";
import { vi } from "vitest";

// jsdom doesn't include WebCrypto, which is required by Tauri's mocking utilities
Object.defineProperty(window, "crypto", {
  value: {
    getRandomValues: (buffer: Uint8Array) => randomFillSync(buffer),
  },
});

// Mock Tauri internals that are expected to exist
Object.defineProperty(window, "__TAURI_INTERNALS__", {
  value: {
    invoke: vi.fn(),
    transformCallback: vi.fn(),
  },
  writable: true,
});
