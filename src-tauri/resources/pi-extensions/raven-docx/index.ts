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
import {
  buildInsertedParagraph,
  findParagraphIndex,
  generateUniqueParaId,
  hasParagraphStyle,
  nextRevisionId,
} from "./paragraphBuilder";

// headless 模式不可用的工具（依赖编辑器实例 / 渲染布局）
const HEADLESS_SKIP = new Set(["read_selection", "read_page", "read_pages"]);

const MUTATION_TOOLS = new Set([
  "suggest_change",
  "add_comment",
  "apply_formatting",
  "set_paragraph_style",
  "reply_comment",
  "resolve_comment",
  "insert_paragraph",
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

  /**
   * 重建 bridge 并重注册全部工具（agentTools + insert_paragraph）。
   * cache 失效的关键：insert_paragraph 用 splice 改变 body 段落数组后，
   * reviewerBridge 闭包内的 paraId→index 缓存会陈旧，导致后续 suggest_change 等
   * 工具用旧映射写到错误段落（静默数据损坏）。重建 bridge 让新 cache 初始为 null，
   * 下次 map() 重建映射；重注册工具让 execute 闭包捕获新 bridge 引用。
   * Reference: .dev/plan/2026-06-27-agent-docx-prompt-fix.md §3.2.3 cache 一致性
   */
  function rebuildBridgeAndTools(): void {
    if (!reviewer) {
      return;
    }
    bridge = createReviewerBridge(reviewer);
    registerAllTools();
  }

  /** 注册全部工具：agentTools（跳过 headless 不可用的）+ insert_paragraph。 */
  function registerAllTools(): void {
    if (!(bridge && reviewer)) {
      return;
    }
    registerDocxTools(pi, bridge, persistDoc);
    registerInsertParagraphTool();
  }

  /**
   * 注册 insert_paragraph 工具：在指定段落后插入带样式的新段落（tracked insertion）。
   * splice 后重建 bridge + 重注册全部工具以失效 cache。
   */
  function registerInsertParagraphTool(): void {
    pi.registerTool({
      name: "insert_paragraph",
      label: "插入段落",
      description:
        "在指定 paraId 对应段落后插入一个新的带样式段落（tracked change，用户可接受/拒绝）。" +
        "参数：afterParaId（插入点段落 paraId）、text（段落纯文本，不含换行）、" +
        "styleId（可选，段落样式如 Heading1/Heading2/Normal，须已存在）。",
      parameters: Type.Object({
        afterParaId: Type.String({
          description: "新段落插入到此 paraId 段落之后",
        }),
        text: Type.String({ description: "段落文本（纯文本，不含换行）" }),
        styleId: Type.Optional(
          Type.String({
            description:
              "段落样式 id（如 Heading1/Heading2/Normal），须已存在；省略为 Normal",
          })
        ),
      }),
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>
      ): Promise<PiToolResult> {
        const afterParaId = params.afterParaId as string;
        const text = params.text as string;
        const styleId = params.styleId as string | undefined;

        if (!reviewer) {
          return {
            content: [{ type: "text", text: "错误：文档未加载" }],
            details: { success: false, isMutation: true },
            isError: true,
          };
        }

        const doc = reviewer.toDocument();
        const body = doc.package?.document;
        if (!body) {
          return {
            content: [{ type: "text", text: "错误：文档 body 不可达" }],
            details: { success: false, isMutation: true },
            isError: true,
          };
        }

        // 1. 定位锚点段落
        const found = findParagraphIndex(body, afterParaId);
        if (!found) {
          return {
            content: [
              { type: "text", text: `错误：paraId ${afterParaId} 不存在` },
            ],
            details: { success: false, isMutation: true },
            isError: true,
          };
        }

        // 2. 校验 styleId（若提供）
        if (
          styleId !== undefined &&
          !hasParagraphStyle(doc.package?.styles, styleId)
        ) {
          const available = (doc.package?.styles?.styles ?? [])
            .filter((s) => s.type === "paragraph")
            .map((s) => s.styleId);
          return {
            content: [
              {
                type: "text",
                text: `错误：样式 ${styleId} 不存在。可用样式：${available.join(", ")}`,
              },
            ],
            details: { success: false, isMutation: true },
            isError: true,
          };
        }

        // 3. 生成 paraId + revisionId，构造段落
        const newParaId = generateUniqueParaId(body);
        const revisionId = nextRevisionId(body);
        const now = new Date().toISOString();
        const newParagraph = buildInsertedParagraph({
          text,
          styleId,
          paraId: newParaId,
          author: "Raven Agent",
          revisionId,
          date: now,
        });

        // 4. splice 插入
        body.content.splice(found.pos + 1, 0, newParagraph);

        // 5. 重建 bridge + 重注册全部工具以失效 cache（blocker：否则后续 suggest_change 静默写错段）
        rebuildBridgeAndTools();

        // 6. 写回临时文件
        await persistDoc();

        return {
          content: [
            {
              type: "text",
              text: `已在段落 ${afterParaId} 后插入新段落（paraId=${newParaId}，样式=${styleId ?? "Normal"}）。`,
            },
          ],
          details: { success: true, isMutation: true },
          isError: false,
        };
      },
    });
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

        // 注册全部工具（agentTools + insert_paragraph）
        // 只注册一次：reload 时 Map 覆盖不会报错，但重建 DocxReviewer 会丢状态
        if (!toolsRegistered) {
          registerAllTools();
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
