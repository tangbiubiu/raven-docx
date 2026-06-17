// features/template/hooks/use-template-vars.ts — 模板变量 Hook (Template Variables Hook)
// 检测、填充、替换文档中的模板变量 {variableName}
// Reference: Phase 4.4b, .dev/plan/phase4-branch-plan.md §4.2

import { useState } from "react";
import { detectVariables } from "@/features/editor/utils";
import { useDocumentStore } from "@/stores/useDocumentStore";

/**
 * useTemplateVars — 管理文档模板变量的检测与填充。
 *
 * @returns 模板变量状态与操作方法
 */
export function useTemplateVars() {
  const editorBridge = useDocumentStore((s) => s.editorBridge);
  const setDirty = useDocumentStore((s) => s.setDirty);

  const [values, setValues] = useState<Record<string, string>>({});

  // 从文档中检测变量
  const doc = editorBridge?.getDocument();
  const variables = detectVariables(doc);

  /**
   * 设置单个变量的值
   */
  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * 批量应用所有已填写的变量值到文档
   */
  const applyAll = async () => {
    if (!editorBridge) {
      return;
    }

    const agent = editorBridge.getAgent() as {
      applyVariables?: (vars: Record<string, string>) => Promise<unknown>;
    } | null;

    if (!agent?.applyVariables) {
      console.warn("Agent applyVariables not available");
      return;
    }

    try {
      // 只传递已填写的变量
      const filledValues = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim() !== "")
      );

      await agent.applyVariables(filledValues);
      setDirty(true);
    } catch (error) {
      console.error("Failed to apply variables:", error);
    }
  };

  return {
    variables,
    values,
    setValue,
    applyAll,
    hasVariables: variables.length > 0,
  };
}
