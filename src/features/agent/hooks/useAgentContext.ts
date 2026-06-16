// features/agent/hooks/useAgentContext.ts — Agent 上下文采集
// 从 useDocumentStore 和 editorBridge 采集选区、大纲、格式等上下文信息
// Reference: .dev/plan/phase3-branch-plan.md §2.3, TSS §4.4

import {
  countParagraphs,
  detectVariables,
  extractAvailableStyles,
  hasImages,
  hasTables,
} from "@/features/editor/utils";
import type { FormatState, OutlineItem } from "@/stores/useDocumentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

/**
 * Agent 完整文档上下文
 */
export type AgentContext = {
  wordCount: number;
  paragraphCount: number;
  hasTables: boolean;
  hasImages: boolean;
  outline: OutlineItem[];
  availableStyles: string[];
  variables: string[];
};

/**
 * Agent 选区上下文
 */
export type AgentSelectionContext = {
  selectedText: string;
  textBefore: string;
  textAfter: string;
  formatting: FormatState | null;
};

/**
 * useAgentContext 返回值类型
 */
export type UseAgentContextReturn = {
  /** 获取完整文档上下文 */
  getFullContext: () => AgentContext;
  /** 获取当前选区上下文 */
  getSelectionContext: () => AgentSelectionContext | null;
  /** 构建 prompt（嵌入上下文 + 指令） */
  buildPrompt: (
    action: string,
    selectionCtx: AgentSelectionContext | null,
    customPrompt?: string
  ) => string;
};

/**
 * 从 ProseMirror view 提取选区前后的文本
 */
function extractSurroundingText(
  view: unknown,
  from: number,
  to: number,
  maxChars = 200
): { before: string; after: string } {
  if (!view || typeof view !== "object") {
    return { before: "", after: "" };
  }

  const v = view as {
    state: {
      doc: {
        content: { size: number };
        textBetween: (from: number, to: number, sep: string) => string;
      };
    };
  };

  if (!v.state?.doc?.textBetween) {
    return { before: "", after: "" };
  }

  const docSize = v.state.doc.content.size;
  const beforeStart = Math.max(0, from - maxChars);
  const afterEnd = Math.min(docSize, to + maxChars);

  const before = v.state.doc.textBetween(beforeStart, from, " ");
  const after = v.state.doc.textBetween(to, afterEnd, " ");

  return { before, after };
}

/**
 * useAgentContext — 采集文档上下文用于 prompt 构建
 *
 * 从 useDocumentStore 和 editorBridge 采集选区、大纲、格式等信息，
 * 供 Agent 命令和 CommandPalette 构建上下文感知的 prompt。
 *
 * @returns UseAgentContextReturn
 *
 * @example
 * ```tsx
 * function AgentAction() {
 *   const { getSelectionContext, buildPrompt } = useAgentContext();
 *
 *   const handleRewrite = () => {
 *     const ctx = getSelectionContext();
 *     const prompt = buildPrompt("rewrite", ctx);
 *     send(prompt);
 *   };
 *
 *   return <button onClick={handleRewrite}>润色</button>;
 * }
 * ```
 */
export function useAgentContext(): UseAgentContextReturn {
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);
  const selectionFormat = useDocumentStore((s) => s.selectionFormat);
  const headings = useDocumentStore((s) => s.headings);
  const charCount = useDocumentStore((s) => s.charCount);
  const editorBridge = useDocumentStore((s) => s.editorBridge);

  const getFullContext = (): AgentContext => {
    const doc = editorBridge?.getDocument();

    return {
      wordCount: charCount,
      paragraphCount: countParagraphs(doc),
      hasTables: hasTables(doc),
      hasImages: hasImages(doc),
      outline: headings,
      availableStyles: extractAvailableStyles(doc),
      variables: detectVariables(doc),
    };
  };

  const getSelectionContext = (): AgentSelectionContext | null => {
    if (!selectionInfo?.text) {
      return null;
    }

    let textBefore = "";
    let textAfter = "";

    const view = editorBridge?.getEditorView();
    if (
      view &&
      selectionInfo.from !== undefined &&
      selectionInfo.to !== undefined
    ) {
      const surrounding = extractSurroundingText(
        view,
        selectionInfo.from,
        selectionInfo.to
      );
      textBefore = surrounding.before;
      textAfter = surrounding.after;
    }

    return {
      selectedText: selectionInfo.text,
      textBefore,
      textAfter,
      formatting: selectionFormat,
    };
  };

  const buildPrompt = (
    action: string,
    selectionCtx: AgentSelectionContext | null,
    customPrompt?: string
  ): string => {
    const parts: string[] = [];

    if (selectionCtx) {
      parts.push(`选中文本：\n${selectionCtx.selectedText}`);
      if (selectionCtx.formatting) {
        parts.push(`当前格式：${JSON.stringify(selectionCtx.formatting)}`);
      }
      parts.push("");
    }

    switch (action) {
      case "rewrite":
        parts.push("请润色上述选中文本，使其更加流畅和专业。");
        break;
      case "expand":
        parts.push("请扩写上述选中文本，补充更多细节和例子。");
        break;
      case "summarize":
        parts.push("请为上述选中文本生成简洁的摘要。");
        break;
      case "translate":
        parts.push("请将上述选中文本翻译成英文。");
        break;
      case "explain":
        parts.push("请解释上述选中文本的含义和背景。");
        break;
      case "fixGrammar":
        parts.push("请修复上述选中文本中的语法错误。");
        break;
      case "makeFormal":
        parts.push("请将上述选中文本改写为更正式的风格。");
        break;
      case "makeCasual":
        parts.push("请将上述选中文本改写为更随意的风格。");
        break;
      case "custom":
        if (customPrompt) {
          parts.push(customPrompt);
        }
        break;
      default:
        if (customPrompt) {
          parts.push(customPrompt);
        }
    }

    return parts.join("\n");
  };

  return {
    getFullContext,
    getSelectionContext,
    buildPrompt,
  };
}
