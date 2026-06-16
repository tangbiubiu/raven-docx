// vitest.setup.ts — Test environment setup (jsdom + Tauri mocks)
// Reference: AGENTS.md §Testing, .dev/docs/modules/infrastructure.md §4

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Modern jsdom (vitest ≥ 4) provides crypto.getRandomValues natively.
// Fallback polyfill for environments where it's missing.
if (
  typeof globalThis.crypto === "undefined" ||
  !globalThis.crypto.getRandomValues
) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: (buffer: Uint8Array) => {
        const bytes = new Uint8Array(buffer.length);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
        buffer.set(bytes);
        return buffer;
      },
    },
    writable: true,
  });
}

// Mock Tauri internals that are expected to exist
Object.defineProperty(window, "__TAURI_INTERNALS__", {
  value: {
    invoke: vi.fn(),
    transformCallback: vi.fn(),
  },
  writable: true,
});

// Mock Tauri event plugin internals (useAgentSession sets up event listeners)
Object.defineProperty(window, "__TAURI_EVENT_PLUGIN_INTERNALS__", {
  value: {
    registerListener: vi.fn().mockResolvedValue(42),
    unregisterListener: vi.fn(),
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
