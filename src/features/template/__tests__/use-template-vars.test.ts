// features/template/__tests__/use-template-vars.test.ts
// useTemplateVars Hook 单元测试
// Reference: Phase 4.4b

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useTemplateVars } from "../hooks/use-template-vars";

// Mock EditorBridge
const mockGetAgent = vi.fn();
const mockGetDocument = vi.fn();

const mockBridge = {
  getAgent: mockGetAgent,
  getDocument: mockGetDocument,
};

/** 构建包含指定文本段落的 mock doc（匹配 detectVariables 期望结构） */
function makeDoc(paragraphTexts: string[]) {
  return {
    package: {
      document: {
        content: paragraphTexts.map((text) => ({
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", text }],
            },
          ],
        })),
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useDocumentStore.setState({
    editorBridge: mockBridge as never,
    isDirty: false,
  });
});

describe("useTemplateVars", () => {
  it("returns empty variables when no document loaded", () => {
    mockGetDocument.mockReturnValue(null);

    const { result } = renderHook(() => useTemplateVars());

    expect(result.current.variables).toEqual([]);
    expect(result.current.hasVariables).toBe(false);
    expect(result.current.values).toEqual({});
  });

  it("detects variables from document", () => {
    mockGetDocument.mockReturnValue(
      makeDoc(["Hello {name}, welcome to {company}."])
    );

    const { result } = renderHook(() => useTemplateVars());

    expect(result.current.variables).toEqual(["name", "company"]);
    expect(result.current.hasVariables).toBe(true);
  });

  it("deduplicates repeated variables", () => {
    mockGetDocument.mockReturnValue(makeDoc(["{name} and {name} again"]));

    const { result } = renderHook(() => useTemplateVars());

    expect(result.current.variables).toEqual(["name"]);
  });

  it("sets variable value", () => {
    mockGetDocument.mockReturnValue(makeDoc(["Hello {name}"]));

    const { result } = renderHook(() => useTemplateVars());

    act(() => {
      result.current.setValue("name", "Alice");
    });

    expect(result.current.values).toEqual({ name: "Alice" });
  });

  it("applies all variables via agent and marks dirty", async () => {
    mockGetDocument.mockReturnValue(makeDoc(["Hello {name}"]));

    const mockAgent = {
      applyVariables: vi.fn().mockResolvedValue(undefined),
    };
    mockGetAgent.mockReturnValue(mockAgent);

    const { result } = renderHook(() => useTemplateVars());

    act(() => {
      result.current.setValue("name", "Alice");
    });

    await act(async () => {
      await result.current.applyAll();
    });

    expect(mockAgent.applyVariables).toHaveBeenCalledWith({ name: "Alice" });
    expect(useDocumentStore.getState().isDirty).toBe(true);
  });

  it("handles agent error gracefully", async () => {
    mockGetDocument.mockReturnValue(makeDoc(["Hello {name}"]));

    const mockAgent = {
      applyVariables: vi.fn().mockRejectedValue(new Error("Agent error")),
    };
    mockGetAgent.mockReturnValue(mockAgent);

    const { result } = renderHook(() => useTemplateVars());

    act(() => {
      result.current.setValue("name", "Alice");
    });

    // Should not throw
    await act(async () => {
      await result.current.applyAll();
    });
  });

  it("skips empty values when applying", async () => {
    mockGetDocument.mockReturnValue(makeDoc(["Hello {name} from {city}"]));

    const mockAgent = {
      applyVariables: vi.fn().mockResolvedValue(undefined),
    };
    mockGetAgent.mockReturnValue(mockAgent);

    const { result } = renderHook(() => useTemplateVars());

    act(() => {
      result.current.setValue("name", "Alice");
      // city left empty
    });

    await act(async () => {
      await result.current.applyAll();
    });

    // Only non-empty values passed
    expect(mockAgent.applyVariables).toHaveBeenCalledWith({ name: "Alice" });
  });
});
