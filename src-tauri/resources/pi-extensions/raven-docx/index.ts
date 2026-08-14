// raven-docx/index.ts — pi extension: headless docx 操作工具
// 通过 DocxReviewer + agentTools 让 pi agent 交互式读写 docx
// Reference: .dev/plan/pi-docx-tools-design.md §6.1

/// <reference path="./ambient.d.ts" />

import { readFileSync, writeFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  type AgentToolResult,
  agentTools,
  createReviewerBridge,
  DocxReviewer,
  executeToolCall,
} from "@eigenpal/docx-editor-agents";
import type { EditorBridge } from "@eigenpal/docx-editor-agents/bridge";
import { type TSchema, Type } from "typebox";
import { normalizeRels, runOfficeCliBatch } from "./officecli";
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
 * description 直接通过 typebox 构造 options 传入（pi 内置 typebox 不支持 Type.Override）。 */
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

/** 书签/题注/交叉引用名称:OOXML 允许 [A-Za-z0-9._-],截断 40 防滥用 */
const NAME_RE = /^[A-Za-z0-9._-]{1,40}$/;
/** 域标识名(mergefield/ref/seq 等):字母/数字/空格/._-,≤60 */
const FIELD_NAME_RE = /^[\w .-]{1,60}$/;

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
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 既有 insert_paragraph 执行体;拆 helper 属架构债(roadmap §8 EditorBridge 对齐),后续重构
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

        // 表格内段落锚点：明确拒绝（top-level 插入语义不支持表格内插入）
        if (found.location === "table-cell") {
          return {
            content: [
              {
                type: "text",
                text: `错误：paraId ${afterParaId} 位于表格单元格内，insert_paragraph 暂不支持以表格内段落为锚点。请在表格外的段落后插入。`,
              },
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
                text: `错误：样式 ${styleId} 不存在。可用样式：${available.join(", ")}。注意：styleId 须用文档内实际的样式 ID（可能是数字），不要假设 Heading1/Normal 存在。`,
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

        // 4. splice 插入（insertPos 已是 top-level body.content 位置）
        // ponytail: paragraphBuilder 的本地 Paragraph 与库 BlockContent 有结构性差异
        // (deletion.content 泛化为 unknown[]),运行时形状一致,cast 对齐;
        // 完整类型对齐属架构债"EditorBridge 类型对齐库"(roadmap §8)
        body.content.splice(found.insertPos, 0, newParagraph as never);

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

  // === officecli 白名单语义工具 (M2) ===
  // Reference: .dev/plan/wps-benchmark/officecli-m2-spec.md §4
  // 原则:固定参数/固定路径(只操作 RAVEN_DOCX_PATH),无通用透传、无任意路径。
  // officecli 用 batch 单进程模式(立即落盘、不留 resident),写后做 rels 规范化并
  // 重建 DocxReviewer 桥(双引擎缓存失效,否则后续 DocxReviewer 工具写旧内存态覆盖)。

  /** officecli 工具错误结果 */
  function officeCliError(text: string): PiToolResult {
    return {
      content: [{ type: "text", text }],
      details: { success: false, isMutation: true },
      isError: true,
    };
  }

  /**
   * officecli 修改链路:落盘 reviewer → batch → rels 规范化 → 重建 reviewer+bridge。
   * 返回给 agent 的摘要文本含 officecli stdout(如插入位置)。
   */
  async function runOfficeCliMutation(
    commands: unknown[]
  ): Promise<PiToolResult> {
    if (!reviewer) {
      return officeCliError("错误:文档未加载");
    }
    const docPath = process.env.RAVEN_DOCX_PATH;
    if (!docPath) {
      return officeCliError("错误:文档未加载(无 RAVEN_DOCX_PATH)");
    }

    // 1. reviewer 内存态先落盘,officecli 基于最新内容操作
    await persistDoc();

    // 2. 单进程 batch(立即落盘,无 resident)
    const r = runOfficeCliBatch(docPath, commands);
    if (!r.ok) {
      return officeCliError(`officecli 执行失败:${r.stderr || r.stdout}`);
    }

    // 3. rels 规范化(officecli 写非标准绝对 Target,如 Target="/media/x.png")
    try {
      const buffer = readFileSync(docPath);
      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      const normalized = await normalizeRels(ab);
      if (normalized !== ab) {
        writeFileSync(docPath, Buffer.from(normalized));
      }

      // 4. 重建 reviewer + bridge(文件已被 officecli 改,内存态过期;
      //    不重建则后续 suggest_change 等基于旧映射静默写错)
      reviewer = await DocxReviewer.fromBuffer(normalized, "Raven Agent");
      rebuildBridgeAndTools();
    } catch (e) {
      return officeCliError(
        `officecli 写后处理失败:${e instanceof Error ? e.message : String(e)}`
      );
    }

    return {
      content: [{ type: "text", text: `完成:${r.stdout.trim()}` }],
      details: { success: true, isMutation: true },
      isError: false,
    };
  }

  /** officecli 工具配置:校验 + 构造 batch 命令 */
  type OfficeCliToolConfig = {
    name: string;
    label: string;
    description: string;
    parameters: TSchema;
    /** 校验并构造 batch 命令;返回 string 表示校验失败(该字符串作为错误返回) */
    build: (params: Record<string, unknown>) => string | unknown[];
  };

  function registerOfficeCliTool(cfg: OfficeCliToolConfig): void {
    pi.registerTool({
      name: cfg.name,
      label: cfg.label,
      description: cfg.description,
      parameters: cfg.parameters,
      execute(
        _toolCallId: string,
        params: Record<string, unknown>
      ): Promise<PiToolResult> {
        const commands = cfg.build(params);
        if (typeof commands === "string") {
          return Promise.resolve(officeCliError(commands));
        }
        return runOfficeCliMutation(commands);
      },
    });
  }

  /** 域类型白名单(officecli docx field 支持的子集,去掉需表达式的 if 等) */
  const FIELD_TYPES = [
    "page",
    "numpages",
    "date",
    "author",
    "title",
    "time",
    "filename",
    "section",
    "sectionpages",
    "mergefield",
    "ref",
    "pageref",
    "noteref",
    "seq",
    "styleref",
    "docproperty",
    "createdate",
    "savedate",
    "printdate",
    "edittime",
    "lastsavedby",
    "subject",
    "numwords",
    "numchars",
    "revnum",
    "template",
    "comments",
    "doccomments",
    "keywords",
  ] as const;
  type FieldType = (typeof FIELD_TYPES)[number];

  /** 注册全部 officecli 白名单工具(与 DocxReviewer 工具并列)。 */
  function registerOfficeCliTools(): void {
    // 插入 LaTeX 公式(oMath)
    registerOfficeCliTool({
      name: "insert_equation",
      label: "插入公式",
      description:
        "插入 LaTeX 公式(oMath)。参数:formula(LaTeX 表达式,必填,≤500 字符)、" +
        "mode(inline/display,默认 display)、afterParaId(可选,插入到该段落后;省略则追加到正文末尾)。",
      parameters: Type.Object({
        formula: Type.String({ description: "LaTeX 公式,如 x^2 + y^2 = z^2" }),
        mode: Type.Optional(
          Type.Union([Type.Literal("inline"), Type.Literal("display")])
        ),
        afterParaId: Type.Optional(
          Type.String({
            description: "插入到此 paraId 段落之后(省略则追加到正文末尾)",
          })
        ),
      }),
      build(params) {
        const formula = (params.formula as string) ?? "";
        if (!formula.trim() || formula.length > 500) {
          return "错误:formula 必填且 ≤500 字符";
        }
        const mode = params.mode === "inline" ? "inline" : "display";
        const afterParaId = params.afterParaId as string | undefined;
        return [
          {
            command: "add",
            parent: afterParaId ? `/body/p[@paraId=${afterParaId}]` : "/body",
            type: "equation",
            props: { mode, formula },
          },
        ];
      },
    });

    // 插入域(field)
    registerOfficeCliTool({
      name: "insert_field",
      label: "插入域",
      description:
        "插入 Word 域(field)。参数:fieldType(枚举,见下)、name(可选,mergefield/ref/seq/styleref/docproperty 等类型的标识名)。" +
        `可选 fieldType:${FIELD_TYPES.join("/")}。`,
      parameters: Type.Object({
        fieldType: Type.Union(FIELD_TYPES.map((t) => Type.Literal(t))),
        name: Type.Optional(
          Type.String({
            description:
              "域标识名(mergefield→域名,ref→书签名,seq→序列标签,...)",
          })
        ),
      }),
      build(params) {
        const fieldType = params.fieldType as FieldType;
        if (!FIELD_TYPES.includes(fieldType)) {
          return `错误:fieldType 必须是 ${FIELD_TYPES.join("/")} 之一`;
        }
        const name = params.name as string | undefined;
        if (name !== undefined && !FIELD_NAME_RE.test(name)) {
          return "错误:name 不合法(≤60 字符,字母/数字/空格/._-)";
        }
        const props: Record<string, string> = { fieldType };
        if (name !== undefined) {
          props.name = name;
        }
        return [{ command: "add", parent: "/", type: "field", props }];
      },
    });

    // 插入脚注
    registerOfficeCliTool({
      name: "insert_footnote",
      label: "插入脚注",
      description:
        "插入脚注。参数:text(脚注文本,必填,≤500 字符)、afterParaId(可选,附加到该段落;省略则附加到正文第一段)。",
      parameters: Type.Object({
        text: Type.String({ description: "脚注文本" }),
        afterParaId: Type.Optional(
          Type.String({
            description: "脚注附加到该 paraId 段落(省略则正文第一段)",
          })
        ),
      }),
      build(params) {
        const text = (params.text as string) ?? "";
        if (!text.trim() || text.length > 500) {
          return "错误:text 必填且 ≤500 字符";
        }
        const afterParaId = params.afterParaId as string | undefined;
        return [
          {
            command: "add",
            parent: afterParaId
              ? `/body/p[@paraId=${afterParaId}]`
              : "/body/p[1]",
            type: "footnote",
            props: { text },
          },
        ];
      },
    });

    // 插入表格
    registerOfficeCliTool({
      name: "insert_table",
      label: "插入表格",
      description:
        "插入空表格。参数:rows(行数 1-20)、cols(列数 1-20)。追加到正文末尾。",
      parameters: Type.Object({
        rows: Type.Number({ description: "行数(1-20)" }),
        cols: Type.Number({ description: "列数(1-20)" }),
      }),
      build(params) {
        const rows = Math.trunc(Number(params.rows));
        const cols = Math.trunc(Number(params.cols));
        if (!Number.isFinite(rows) || rows < 1 || rows > 20) {
          return "错误:rows 必须是 1-20 的整数";
        }
        if (!Number.isFinite(cols) || cols < 1 || cols > 20) {
          return "错误:cols 必须是 1-20 的整数";
        }
        return [
          {
            command: "add",
            parent: "/body",
            type: "table",
            props: { rows, cols },
          },
        ];
      },
    });

    // 插入目录(TOC 域;generateTOC 在缺 TOCHeading/TOC1 样式文档上往返回滚,已决策走 OfficeCLI)
    registerOfficeCliTool({
      name: "insert_toc",
      label: "插入目录",
      description:
        "插入目录域(TOC)。参数:levels(可选,标题级别范围如 '1-3',默认 '1-3')、" +
        "title(可选,目录标题文字)。页码需在 Word/WPS 中按 F9 刷新后显示。",
      parameters: Type.Object({
        levels: Type.Optional(
          Type.String({ description: "标题级别范围,如 1-3" })
        ),
        title: Type.Optional(
          Type.String({ description: "目录标题文字(可选)" })
        ),
      }),
      build(params) {
        const props: Record<string, string> = {
          levels: (params.levels as string) || "1-3",
        };
        const title =
          typeof params.title === "string" ? params.title.trim() : "";
        if (title) {
          props.title = title;
        }
        return [{ command: "add", parent: "/", type: "toc", props }];
      },
    });

    // 书签
    registerOfficeCliTool({
      name: "add_bookmark",
      label: "添加书签",
      description:
        "添加书签。参数:name(书签名,必填,仅字母/数字/._-,≤40)、text(可选,书签覆盖的文字)。",
      parameters: Type.Object({
        name: Type.String({ description: "书签名(字母/数字/._-)" }),
        text: Type.Optional(
          Type.String({ description: "书签覆盖的文字(可选)" })
        ),
      }),
      build(params) {
        const name = (params.name as string) ?? "";
        if (!NAME_RE.test(name)) {
          return "错误:name 仅允许字母/数字/._- 且 ≤40 字符";
        }
        const props: Record<string, string> = { name };
        const text = typeof params.text === "string" ? params.text.trim() : "";
        if (text) {
          props.text = text;
        }
        return [{ command: "add", parent: "/", type: "bookmark", props }];
      },
    });

    // 题注(SEQ 域)
    registerOfficeCliTool({
      name: "add_caption",
      label: "添加题注",
      description:
        "添加题注序号(SEQ 域)。参数:label(序列标签,必填,如 Figure/Table,仅字母/数字/._-,≤40)。" +
        "配合 insert_paragraph 插入题注文字(如 '图 1:...')使用。",
      parameters: Type.Object({
        label: Type.String({
          description: "序列标签,如 Figure/Table/Equation",
        }),
      }),
      build(params) {
        const label = (params.label as string) ?? "";
        if (!NAME_RE.test(label)) {
          return "错误:label 仅允许字母/数字/._- 且 ≤40 字符";
        }
        return [
          {
            command: "add",
            parent: "/",
            type: "field",
            props: { fieldType: "seq", id: label },
          },
        ];
      },
    });

    // 交叉引用(REF/PAGEREF 域)
    registerOfficeCliTool({
      name: "cross_reference",
      label: "插入交叉引用",
      description:
        "插入交叉引用域。参数:bookmark(目标书签名,必填,须已存在)、kind(ref=引用内容,默认;pageref=引用页码)。",
      parameters: Type.Object({
        bookmark: Type.String({
          description: "目标书签名(须已通过 add_bookmark 创建)",
        }),
        kind: Type.Optional(
          Type.Union([Type.Literal("ref"), Type.Literal("pageref")])
        ),
      }),
      build(params) {
        const bookmark = (params.bookmark as string) ?? "";
        if (!NAME_RE.test(bookmark)) {
          return "错误:bookmark 仅允许字母/数字/._- 且 ≤40 字符";
        }
        const kind = params.kind === "pageref" ? "pageref" : "ref";
        return [
          {
            command: "add",
            parent: "/",
            type: "field",
            props: { fieldType: kind, name: bookmark },
          },
        ];
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

        // 注册全部工具(agentTools + insert_paragraph + officecli 白名单)
        // 只注册一次:reload 时 Map 覆盖不会报错,但重建 DocxReviewer 会丢状态
        if (!toolsRegistered) {
          registerAllTools();
          registerOfficeCliTools();
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
