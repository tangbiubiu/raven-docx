// raven-docx/index.ts — pi extension: headless docx 操作工具
// 通过 DocxReviewer + agentTools 让 pi agent 交互式读写 docx
// Reference: .dev/plan/pi-docx-tools-design.md §6.1

import { readFileSync, writeFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  type AgentToolResult,
  agentTools,
  createReviewerBridge,
  DocxReviewer,
  type EditorBridge,
  executeToolCall,
} from "@eigenpal/docx-editor-agents";
import { type TSchema, Type } from "typebox";

// headless 模式不可用的工具（依赖编辑器实例 / 渲染布局）
const HEADLESS_SKIP = new Set(["read_selection", "read_page", "read_pages"]);

// 修改类工具（触发文档变更通知，用于 Rust 侧 document_dirty 检测）
const MUTATION_TOOLS = new Set([
  "suggest_change",
  "add_comment",
  "apply_formatting",
  "set_paragraph_style",
  "reply_comment",
  "resolve_comment",
]);

// pi 工具执行结果
type PiToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: unknown;
  isError?: boolean;
};

/** typebox options 类型（含 description 等元数据）。 */
type TypeboxOptions = { description?: string };

/** 提取 schema 的 description 作为 typebox options。 */
function descOpt(schema: Record<string, unknown>): TypeboxOptions {
  const description = schema.description as string | undefined;
  return description ? { description } : {};
}

/** 转换 object schema 到 typebox Object，递归处理 properties。 */
function convertObject(
  schema: Record<string, unknown>,
  options: TypeboxOptions
): TSchema {
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const required = (schema.required as string[]) ?? [];

  if (!properties) {
    return Type.Object({}, { ...options, additionalProperties: true });
  }

  const fields: Record<string, TSchema> = {};
  for (const [key, propSchema] of Object.entries(properties)) {
    const fieldSchema = jsonSchemaToTypebox(propSchema);
    fields[key] = required.includes(key)
      ? fieldSchema
      : Type.Optional(fieldSchema);
  }
  return Type.Object(fields, options);
}

/**
 * JSON Schema → typebox 转换器（轻量，覆盖 docx-editor-agents 用到的类型）。
 * pi 的 registerTool 期望 typebox schema，agentTools.inputSchema 是原生 JSON Schema。
 * 未知类型用 Type.Any() 兜底——pi 仍会把参数原样传给 execute。
 * description 直接通过 typebox 构造 options 传入（pi 内置 typebox 不支持 Type.Override）。
 */
function jsonSchemaToTypebox(schema: Record<string, unknown>): TSchema {
  const type = schema.type as string | undefined;
  const options = descOpt(schema);

  switch (type) {
    case "string":
      if (schema.enum) {
        return Type.Union(
          (schema.enum as string[]).map((s) => Type.Literal(s)),
          options
        );
      }
      return Type.String(options);
    case "number":
      return Type.Number(options);
    case "boolean":
      return Type.Boolean(options);
    case "object":
      return convertObject(schema, options);
    case "array": {
      const items = schema.items as Record<string, unknown> | undefined;
      const itemSchema = items ? jsonSchemaToTypebox(items) : Type.Any();
      return Type.Array(itemSchema, options);
    }
    default:
      // 无 type 字段（如 apply_formatting 的 underline 联合类型）→ Any 兜底
      return Type.Any(options);
  }
}

/** 执行单个 agent tool，将 docx-editor 结果转为 pi 工具结果格式。 */
function runTool(
  toolName: string,
  params: Record<string, unknown>,
  bridge: EditorBridge
): AgentToolResult {
  return executeToolCall(toolName, params, bridge);
}

/** 将 AgentToolResult 转为 LLM 可读文本。 */
function formatToolResult(result: AgentToolResult): string {
  if (!result.success) {
    return result.error ?? "Unknown error";
  }
  if (typeof result.data === "string") {
    return result.data;
  }
  return JSON.stringify(result.data);
}

/** session_start handler 类型（最小契约，避免依赖 pi 完整类型）。 */
type SessionStartEvent = { reason: string };
type SessionContext = {
  ui: { notify: (msg: string, level: string) => void };
};

export default function ravenDocxExtension(pi: ExtensionAPI) {
  let reviewer: DocxReviewer | null = null;
  let bridge: EditorBridge | null = null;
  let toolsRegistered = false;

  /** 将当前 reviewer 状态写回临时文件（修改类工具执行后 / session_shutdown 时调用）。 */
  async function persistDoc(): Promise<void> {
    if (!reviewer) {
      return;
    }
    const docPath = process.env.RAVEN_DOCX_PATH;
    if (!docPath) {
      return;
    }
    try {
      const buf = await reviewer.toBuffer();
      writeFileSync(docPath, Buffer.from(buf));
    } catch (e) {
      console.error("[raven-docx] 写回文件失败:", e);
    }
  }

  pi.on(
    "session_start",
    async (event: SessionStartEvent, ctx: SessionContext) => {
      // 幂等：只在 startup/new 时加载，避免 /reload 重复触发丢失未保存的 tracked changes
      if (event.reason !== "startup" && event.reason !== "new") {
        return;
      }

      const docPath = process.env.RAVEN_DOCX_PATH;
      if (!docPath) {
        // 自由模式：不注册 docx tools，pi 退化为纯问答
        ctx.ui.notify("未指定文档，文档工具不可用", "warn");
        return;
      }

      try {
        const buffer = readFileSync(docPath);
        reviewer = await DocxReviewer.fromBuffer(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          ) as ArrayBuffer,
          "Raven Agent"
        );
        bridge = createReviewerBridge(reviewer);

        // 注册可用的 agentTools（跳过 headless 不可用的）
        // 只注册一次：reload 时 Map 覆盖不会报错，但重建 DocxReviewer 会丢状态
        if (!toolsRegistered) {
          registerDocxTools(pi, bridge, persistDoc);
          toolsRegistered = true;
        }

        ctx.ui.notify(
          `文档已加载，${agentTools.length - HEADLESS_SKIP.size} 个工具可用`,
          "info"
        );
      } catch (e) {
        ctx.ui.notify(`文档加载失败: ${e}`, "error");
        console.error("[raven-docx] session_start 加载失败:", e);
      }
    }
  );

  // session_shutdown 时写回文件（兜底，确保修改不丢失）
  pi.on("session_shutdown", async () => {
    await persistDoc();
    if (reviewer) {
      console.log(
        "[raven-docx] session_shutdown 写回成功:",
        process.env.RAVEN_DOCX_PATH
      );
    }
  });
}

/** 注册可用的 agentTools 为 pi 工具（跳过 headless 不可用的）。 */
function registerDocxTools(
  pi: ExtensionAPI,
  bridgeRef: EditorBridge,
  persistDoc: () => Promise<void>
): void {
  for (const tool of agentTools) {
    if (HEADLESS_SKIP.has(tool.name)) {
      continue;
    }

    pi.registerTool({
      name: tool.name,
      label: tool.displayName ?? tool.name,
      description: tool.description,
      parameters: jsonSchemaToTypebox(tool.inputSchema),
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>
      ): Promise<PiToolResult> {
        const result = runTool(tool.name, params, bridgeRef);
        const text = formatToolResult(result);
        // 修改类工具成功执行 → 立即写回文件，确保前端 agent_end 时 reloadFromTemp 能读到最新内容
        if (result.success && MUTATION_TOOLS.has(tool.name)) {
          await persistDoc();
        }
        return {
          content: [{ type: "text", text }],
          details: { ...result, isMutation: MUTATION_TOOLS.has(tool.name) },
          isError: !result.success,
        };
      },
    });
  }
}
