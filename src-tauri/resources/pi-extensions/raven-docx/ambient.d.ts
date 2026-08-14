// raven-docx/ambient.d.ts — pi 运行时注入模块的类型声明
// @earendil-works/pi-coding-agent 与 typebox 由 pi 进程在加载扩展时注入,
// 不在扩展的 node_modules 中,静态环境(tsc / LSP)无法解析。
// 这里声明实际用到的子集;运行时以 pi 提供的真实实现为准。
// Reference: .dev/plan/pi-docx-tools-design.md §6.1

declare module "@earendil-works/pi-coding-agent" {
  export type ToolResult = {
    content: Array<{ type: "text"; text: string }>;
    details?: unknown;
    isError?: boolean;
  };

  /** pi 扩展 API 最小契约(仅声明 raven-docx 用到的成员) */
  export type ExtensionAPI = {
    registerTool: (tool: {
      name: string;
      label: string;
      description: string;
      parameters: unknown;
      execute: (
        toolCallId: string,
        params: Record<string, unknown>
      ) => Promise<unknown>;
    }) => void;
    /** handler 参数用 never[]:接受任意签名的回调(pi 按事件实际签名调用) */
    on: (event: string, handler: (...args: never[]) => unknown) => void;
  };
}

declare module "typebox" {
  export type TSchema = object;
  type Options = Record<string, unknown>;

  export const Type: {
    String: (options?: Options) => TSchema;
    Number: (options?: Options) => TSchema;
    Boolean: (options?: Options) => TSchema;
    Union: (schemas: TSchema[], options?: Options) => TSchema;
    Literal: (value: string | number | boolean) => TSchema;
    Object: (properties: Record<string, TSchema>, options?: Options) => TSchema;
    Array: (schema: TSchema, options?: Options) => TSchema;
    Optional: (schema: TSchema) => TSchema;
    Any: (options?: Options) => TSchema;
  };
}
