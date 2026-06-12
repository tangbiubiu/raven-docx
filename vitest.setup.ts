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

// jsdom localStorage is a proxy without setItem/getItem — provide a real implementation
const storage = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    get length() {
      return storage.size;
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
  },
  writable: true,
});
