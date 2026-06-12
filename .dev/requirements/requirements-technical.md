# geex-docx 技术规格 (TSS)

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**: 草案 — 规划阶段
>
> **相关文档**：
> - [业务需求文档 (BRD)](./requirements-business.md) — 第 1~3 节：愿景、用户、范围、验收标准
> - [功能需求规格 (FRS)](./requirements-functional.md) — 第 4 节：完整功能需求表

---

## 1. 非功能需求 (NFR)

### 1.1 性能

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 冷启动时间 | < 3 秒 | macOS 13+ 基准环境 |
| 100 页文档打开 | < 2 秒 | OOXML 解析 + 渲染 |
| 文档保存 | < 1 秒 | 本地 SSD |
| 文本输入延迟 | < 16ms（60fps） | 单次按键到渲染 |
| Agent 响应 | < 3 秒（流式首 token） | 网络正常条件 |

### 1.2 资源占用

| 指标 | 目标值 |
|------|--------|
| 空闲内存 | < 150 MB |
| 编辑中内存 | < 300 MB（100 页文档） |
| 安装包大小 | < 50 MB（macOS ARM） |

### 1.3 兼容性

| 平台 | 最低版本 |
|------|---------|
| macOS | 13 (Ventura) + |
| Windows | 10 (22H2) +, 11 |
| Linux | Ubuntu 22.04+, Fedora 38+ |

### 1.4 安全性

- 文件系统访问仅限用户主动选择的路径（Tauri v2 Capability 白名单）
- API Key 通过系统 Keychain/Credential Manager 加密存储，不在本地明文落盘
- 不自动上传文档内容，Agent 调用需用户显式触发


### 1.5 可靠性

- docx 解析失败时，显示明确错误信息，不崩溃
- 崩溃恢复：自动保存草稿，下次启动时恢复
- 所有 Tauri 命令返回 `Result<T, String>`，前端必须处理错误状态

---

### 1.6 超大文档性能策略

> **背景**：docx-editor 基于 ProseMirror 构建，ProseMirror EditorView 仅渲染视口内可见节点，天然支持虚拟滚动。
> 超大文档的性能瓶颈在 OOXML 解析阶段（ZIP 解压 + XML 反序列化），而非渲染阶段。

| 阶段 | 策略 | 说明 |
|------|------|------|
| **文件打开** | 全量解析 + 进度指示 | OOXML 解析在 Rust 端完成后一次性传入前端；50MB+ 文件显示进度条 |
| **渲染** | ProseMirror Viewport | EditorView 仅渲染可见区域的 DOM 节点（约3-5页），视口外节点为 ProseMirror 内部表示 |
| **Agent 全文操作** | 分批注入（每批 2000 字 + 格式上下文） | 见 §4.4.1 上下文注入分级策略 |
| **前端交互** | 打开前警告确认对话框 | 见 error-states.md §2.2 |
| **降级** | 禁用全文校对等高开销功能 | 超大文档打开后工具栏给出轻量提示 |

**阈值定义**：
- 文件 > 50MB 或页面数 > 500 → 弹出警告确认对话框
- 文件 > 100MB → 打开后自动禁用全文 Agent 校对功能

**已知限制（MVP）**：
- 全文校对分批注入可能丢失跨节上下文。未来方案：pi extension 注册 `get_page_content(n)` / `search_document(q)` 工具，Agent 按需拉取。
- 暂不引入 Web Worker 异步解析（docx-editor 不支持 worker 上下文中的 ProseMirror 实例化）。

## 2. 系统架构约束

| 约束 | 决策 | 原因 |
|------|------|------|
| 前端框架 | React 19 + TypeScript | 生态丰富，React Compiler 自动优化 |
| 桌面框架 | Tauri v2 | 性能优、包体积小、Rust 安全性 |
| 样式方案 | Tailwind CSS v4 + shadcn/ui | 快速构建 UI，设计一致性 |
| 类型桥梁 | tauri-specta | 前后端类型安全绑定 |
| 包管理器 | Bun | 速度快，兼容 Node 生态 |
| 代码规范 | Biome | 统一 Lint + Format |
| Agent 后端 | **pi agent** RPC 模式 (`pi --mode rpc`) | Tauri Rust 后端 spawn pi 子进程，JSONL stdin/stdout 通信 |
| Agent 通信 | JSONL 协议（stdin/stdout） | stdin 写入 JSON 命令，stdout 流式读取事件 |
| Agent 配置 | pi agent `auth.json` + `models.json` + `settings.json` | 通过 `--agent-dir` 指定配置目录 |

| Key 存储 | 系统 Keychain (macOS) / Credential Manager (Windows) | API Key 加密存储，不落盘明文 |

---

## 3. 数据模型（概要）

### 3.1 文档对象模型 (基于 docx-editor `DocxPackage`)

```typescript
// 这是 docx-editor 已实现的完整 OOXML 模型
interface DocxPackage {
  document: DocumentBody;         // 文档正文（段落、表格、图片等块级内容）
  styles?: StyleDefinitions;      // 样式定义（Normal, Heading 1-6, 自定义样式）
  numbering?: NumberingDefinitions; // 多级列表编号定义
  headers?: Map<string, HeaderFooter>;   // 页眉
  footers?: Map<string, HeaderFooter>;   // 页脚
  footnotes?: Footnote[];         // 脚注
  endnotes?: Endnote[];           // 尾注
  comments?: Comment[];           // 批注
  media?: Map<string, MediaFile>; // 图片等媒体资源
  theme?: Theme;                  // 主题（颜色方案 + 字体方案）
  fontTable?: FontTable;          // 字体表
  settings?: DocumentSettings;    // 文档设置
  properties?: {                  // 文档元数据
    title?: string;
    subject?: string;
    creator?: string;
    keywords?: string;
    description?: string;
    lastModifiedBy?: string;
    revision?: number;
    created?: Date;
    modified?: Date;
  };
}

// 块级内容 = 段落 | 表格 | 结构化文档标签
interface DocumentBody {
  content: BlockContent[];        // (Paragraph | Table | BlockSdt)[]
  sections?: Section[];
  finalSectionProperties?: SectionProperties;
}

// 段落结构
interface Paragraph {
  type: 'paragraph';
  paraId?: string;                // 唯一段落 ID
  content: ParagraphContent[];    // Run | Hyperlink | Image | Field | CommentRange | TrackedChanges ...
  formatting?: ParagraphFormatting; // 对齐、缩进、行距、段间距、边框、底纹...
  sectionProperties?: SectionProperties; // 节属性（若此段后换节）
  listRendering?: ListRendering;  // 列表渲染信息
}

// 文本运行（带格式的连续文本段）
interface Run {
  type: 'run';
  content: RunContent[];          // 文本 | 制表符 | 换行符 | 分页符 | 符号 | 脚注引用...
  formatting?: TextFormatting;    // 字体、字号、颜色、粗斜体、上下标、字符间距...
}

// 文本格式（完整属性集）
interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: { style: UnderlineStyle; color?: ColorValue };
  strike?: boolean;
  doubleStrike?: boolean;
  fontSize?: number;              // 半点 (1pt = 2 half-points)
  fontFamily?: { ascii?: string; hAnsi?: string; eastAsia?: string; cs?: string };
  color?: ColorValue;
  highlight?: string;
  vertAlign?: 'baseline' | 'superscript' | 'subscript';
  smallCaps?: boolean;
  allCaps?: boolean;
  scale?: number;
  spacing?: number;
  kerning?: number;
  // ... 更多属性
}

// 表格
interface Table {
  type: 'table';
  rows: TableRow[];
  formatting?: TableFormatting;
}

interface TableRow {
  type: 'tableRow';
  cells: TableCell[];
}

interface TableCell {
  type: 'tableCell';
  content: (Paragraph | Table)[]; // 单元格内可嵌套表格
  formatting?: TableCellFormatting;
}

// 图片
interface Image {
  type: 'image';
  rId: string;                    // 关联 media 的引用 ID
  size: ImageSize;
  alt?: string;
  wrap: ImageWrap;                // 文字环绕方式
  position?: ImagePosition;       // 绝对位置
  // ...
}
```

### 3.2 编辑器桥接层 (应用层状态)

```typescript
// 桌面端封装 docx-editor 的状态管理
interface EditorBridgeState {
  // 文档
  document: Document | null;
  documentBuffer: ArrayBuffer | null;  // 原始 OOXML 字节
  documentPath: string | null;         // 本地文件路径
  isDirty: boolean;

  // 编辑器
  editorView: EditorView | null;       // ProseMirror EditorView
  agent: DocumentAgent | null;         // 编程式文档操作接口

  // 选区
  selection: SelectionInfo | null;     // 扁平化的选区信息

  // 布局
  zoom: number;
  totalPages: number;
  currentPage: number;

  // Agent
  agentSession: PiAgentSession | null;
}

// 通过 DocxEditorRef 暴露给外部的能力
interface EditorHandle {
  getAgent(): DocumentAgent | null;
  getDocument(): Document | null;
  getSelectionInfo(): SelectionInfo | null;
  findInDocument(query: string): FindResult[];
  applyFormatting(opts: ApplyFormattingOptions): boolean;
  setParagraphStyle(opts: { paraId: string; styleId: string }): boolean;
  proposeChange(opts: ProposeChangeOptions): boolean;
  addComment(opts: AddCommentOptions): number | null;
  getPageContent(page: number): PageContent | null;
  scrollToParaId(paraId: string): boolean;
  focus(): void;
  save(): Promise<ArrayBuffer | null>;
  // ... 更多
}
```

### 3.3 Agent 编程式文档操作 (DocumentAgent)

```typescript
// docx-editor 提供的 Agent 操作接口（业务层直接使用，无需从零实现）
class DocumentAgent {
  // 文本操作
  insertText(position: Position, text: string, opts?: InsertTextOptions): DocumentAgent;
  replaceRange(range: Range, text: string, opts?: InsertTextOptions): DocumentAgent;
  deleteRange(range: Range): DocumentAgent;

  // 格式操作
  applyFormatting(range: Range, formatting: Partial<TextFormatting>): DocumentAgent;
  applyParagraphFormatting(paraIndex: number, formatting: Partial<ParagraphFormatting>): DocumentAgent;
  applyStyle(paraIndex: number, styleId: string): DocumentAgent;

  // 结构化操作
  insertTable(pos: Position, rows: number, cols: number, opts?: InsertTableOptions): DocumentAgent;
  insertImage(pos: Position, src: string, opts?: InsertImageOptions): DocumentAgent;
  insertHyperlink(range: Range, url: string, opts?: InsertHyperlinkOptions): DocumentAgent;

  // 段落操作
  insertParagraphBreak(pos: Position): DocumentAgent;
  mergeParagraphs(startIndex: number, count: number): DocumentAgent;
  splitParagraph(pos: Position): DocumentAgent;

  // 批量操作
  executeCommands(commands: AgentCommand[]): DocumentAgent;

  // 模板变量
  setVariable(name: string, value: string): DocumentAgent;
  applyVariables(variables?: Record<string, string>): Promise<DocumentAgent>;

  // 查询
  getAgentContext(): AgentContext;     // 字数、段落数、大纲、样式列表、变量列表...
  getText(): string;
  getFormattedText(): FormattedTextSegment[];
  getWordCount(): number;
  getPageCount(): number;

  // 输出
  toBuffer(): Promise<ArrayBuffer>;
  toBlob(mimeType?: string): Promise<Blob>;
}
```

---

## 4. Agent 交互协议

### 4.1 架构概览

```
┌─────────────────────────────────────────────────────────┐
│ geex-docx (Tauri Desktop App)                          │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐ │
│  │DocxEditor│──▶│ Tauri Command│──▶│ pi --mode rpc  │ │
│  │ (React)  │◀──│  (Rust)      │◀──│  (子进程)       │ │
│  └──────────┘   └──────────────┘   └───────┬────────┘ │
│                                    stdin/stdout JSONL │
└─────────────────────────────────────────────┼─────────┘
                                              │
                      ┌───────────────────────┼───────┐
                      │  pi agent provider            │
                      │  Anthropic / OpenAI / ...     │
                      └───────────────────────────────┘
```

- **Tauri Rust 后端**: spawn `pi --mode rpc` 子进程，管理生命周期
- **JSONL 协议**: stdin 写命令（`prompt`/`abort`），stdout 读事件（`text_delta`/`tool_execution`/`agent_end`）
- **上下文注入**: 前端收集文档上下文（选区、大纲、格式），构建为 prompt 发送给 pi agent

### 4.2 交互流程

```
[用户选中文本] → [Cmd+K 唤起命令面板] → [选择预设动作 / 输入自然语言]
→ [前端构建 prompt（嵌入选区上下文 + 文档大纲 + 样式信息 + AgentCommand schema）]
→ [调用 Tauri command → Rust 写 JSON 到 pi 进程 stdin]
→ [pi agent 调用 LLM，事件流通过 stdout → Rust → Tauri event → React 渲染]
→ [agent_end 时解析响应中的 JSON（AgentCommand[] 或 newText）]
→ [DocumentAgent.executeCommands() 应用变更]
```

### 4.3 数据类型（基于 docx-editor）

```typescript
// ===== 预设 AI 动作 =====
type AIAction =
  | 'askAI'        // 自由问答（关于选中文本）
  | 'rewrite'      // 重写（保持原意，换种说法）
  | 'expand'       // 扩写
  | 'summarize'    // 总结
  | 'translate'    // 翻译
  | 'explain'      // 解释含义
  | 'fixGrammar'   // 修复语法错误
  | 'makeFormal'   // 转为正式风格
  | 'makeCasual'   // 转为随意风格
  | 'custom';      // 自定义自然语言指令

// ===== 前端 → Agent 请求 =====
interface AIActionRequest {
  action: AIAction;
  context: AgentSelectionContext;   // 选区上下文
  customPrompt?: string;            // 自定义指令（action='custom' 时使用）
  targetLanguage?: string;          // 翻译目标语言
  options?: Record<string, unknown>;
}

interface AgentSelectionContext {
  selectedText: string;             // 选中的文本
  textBefore: string;               // 选区前文
  textAfter: string;                // 选区后文
  paragraph: ParagraphContext;      // 所在段落信息
  paragraphFormatting: Partial<ParagraphFormatting>;
  formatting: Partial<TextFormatting>; // 选区格式
  inTable?: boolean;
  inHyperlink?: boolean;
  suggestedActions?: SuggestedAction[];
  range: Range;                     // 选区位置
}

// ===== 完整文档上下文（全文操作时使用）=====
interface AgentContext {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  hasTables: boolean;
  hasImages: boolean;
  hasHyperlinks: boolean;
  language?: string;
  outline: ParagraphOutline[];       // 文档大纲（标题层级）
  sections: SectionInfo[];           // 节信息
  availableStyles: StyleInfo[];      // 可用样式列表
  variables: string[];               // 模板变量列表
  variableCount: number;
}

// ===== Agent → 编辑器响应 =====
interface AgentResponse {
  success: boolean;
  newText?: string;                  // 建议的新文本（简单替换场景）
  newContent?: AgentContent[];       // 建议的新内容（多段落场景）
  commands?: AgentCommand[];         // 结构化命令（精确操作场景）
  metadata?: Record<string, unknown>;
  warnings?: string[];
  error?: string;
}

// ===== Agent 可发出的结构化命令 =====
type AgentCommand =
  | InsertTextCommand       // 插入文本
  | ReplaceTextCommand      // 替换文本
  | DeleteTextCommand       // 删除文本
  | FormatTextCommand       // 设置文本格式
  | FormatParagraphCommand  // 设置段落格式
  | ApplyStyleCommand       // 应用样式
  | InsertTableCommand      // 插入表格
  | InsertImageCommand      // 插入图片
  | InsertHyperlinkCommand  // 插入超链接
  | RemoveHyperlinkCommand  // 删除超链接
  | InsertParagraphBreakCommand  // 插入段落分隔
  | MergeParagraphsCommand  // 合并段落
  | SplitParagraphCommand   // 拆分段落
  | SetVariableCommand      // 设置变量
  | ApplyVariablesCommand;  // 批量应用变量
```

### 4.4 上下文注入策略

pi agent 通过 RPC 子进程运行，无法直接调用编辑器 API。采用 **Prompt 注入** 方式：

1. **短文本操作**（润色/翻译/扩写）：将选区 + 前后文 + 格式信息直接嵌入 prompt，agent 返回 `newText` 或 `newContent`
2. **全文操作**（校对/摘要/排版）：嵌入完整文档内容（或大纲摘要）+ `AgentCommand` JSON schema 作为系统指令，agent 返回结构化 `AgentCommand[]`
3. **未来增强**：通过 pi extension 为 agent 注册 `get_document_context` / `apply_edits` 等工具，使 agent 能交互式查询和修改文档

#### 4.4.1 上下文注入分级（MVP 策略）

| 操作类型 | 注入内容 | 预估 tokens | 适用场景 |
|---------|---------|------------|---------|
| **短选区** (≤500字) | 选区 + 前后 200 字符 + 格式信息 | ~800 | 润色/翻译/扩写/解释/风格转换 |
| **全文概述** | 标题大纲 + 段落数/字数/样式列表 + AgentCommand schema | ~1500 | 摘要/续写/排版优化 |
| **全文校对** | 按节分页注入（每 2000 字一批 + 格式） | ~3000/批 | 全文校对（分批） |

> ⚠️ **已知限制 (MVP)**：全文校对分批注入可能丢失跨节上下文。
> 未来方案：pi extension 注册 `get_page_content(n)` / `search_document(q)` 工具，Agent 按需拉取。

#### 4.4.2 两种 Agent 模式

| 模式 | 触发条件 | --session | 可用操作 | AgentSidebar 文案 |
|------|---------|-----------|---------|------------------|
| **自由模式** | 无文档打开 | 无 | 通用问答、系统帮助 | "打开文档以启用完整 Agent 功能" |
| **文档模式** | 有文档打开 | `--session <doc_hash>` | 全部 Agent 能力 | 正常交互界面 |

自由模式下：
- AgentSidebar 仍可打开（显示为只读问答模式）
- Cmd+K 命令面板可唤起，但文档操作类命令置灰
- QuickActions 中的续写/润色/翻译/扩写均禁用

#### 4.4.3 前端消息发送模式

pi RPC 子进程一次只能处理一个 prompt。前端通过 `agent_send` 命令的 `mode` 参数控制发送行为：

| mode | 行为 | 触发场景 |
|------|------|---------|
| `"default"` | 若 Idle → 直接发送；若 Streaming → 自动入队（follow_up） | 用户正常发送指令 |
| `"steer"` | 中断当前 turn（tool_call 完成后注入新指令），清空 pending 队列 | 用户点击「打断」按钮后发送新指令 |
| `"enqueue"` | 无论当前状态，始终入队等待 | 批量操作管道（润色 → 翻译 → 校对） |

**用户操作 → mode 映射**：

| 用户操作 | mode | UI 反馈 |
|---------|------|---------|
| 发送新指令（Agent 空闲） | `"default"` | 直接开始输出 |
| 发送新指令（Agent 忙碌，未点打断） | `"default"` → 后端自动入队 | 显示「排队中 (#N)」 |
| 点击「打断」+ 发送新指令 | `"steer"` | 终止当前动画，立即开始新输出 |
| 连续操作管道（如：润色 → 翻译 → 润色） | `"enqueue"` ×3 | 依次显示「排队中 (#1)」「(#2)」「(#3)」 |

> ⚠️ `"enqueue"` vs `"default"` 的差异：`"enqueue"` 不会因当前 turn 结束而自动清空队列。当用户预期是管道操作时使用 `"enqueue"`，
> 避免前一步完成后的 `agent_end` 导致后续指令被意外丢弃。

#### 4.4.4 首次启动引导

Phase 1 实现：首次启动时 SettingsDrawer 自动打开并定位到 `ApiKeySection`。
后续 Phase 可在编辑器空白区域添加引导卡片。

检测逻辑：`useSettingsStore.isLoaded && !apiConfig.apiKey` → autoOpen = true（仅一次）。

---

## 5. pi agent 进程管理器

pi agent 以 RPC 子进程方式运行，需在 Tauri Rust 后端实现三个核心管理器以保证 Agent 功能的稳定性和响应体验。

### 5.1 进程生命周期管理

```
状态机：

              [NotInstalled]
                   │
              install pi
                   ▼
               spawn (懒启动)
  [Stopped] ───────────────────▶ [Idle]
     ▲                               │
     │ shutdown                 prompt│
     │                               ▼
     │                          [Streaming]
     │                           │        │
     │                      steer│   crash│
     │                           ▼        ▼
     │                         [Idle]  [Dead]
     │                                    │
     └────── auto-restart (最多 3 次) ────┘
                        ▲
                   [ShuttingDown]
                        │
                SIGTERM → 等 3s → SIGKILL

[NotInstalled]：pi 二进制未找到 → 显示下载引导
[ShuttingDown]：SIGTERM → 等 3s → SIGKILL → 释放 auth.json
```

| 策略 | 描述 | 理由 |
|------|------|------|
| 懒启动 | 首次 Agent 请求时才 spawn pi 子进程 | 避免冷启动时额外进程开销 |
| 崩溃恢复 | 子进程异常退出 → 自动重启（最多 3 次/分钟内）→ 通知前端「Agent 已恢复，请重试」 | pi 崩溃不应带崩主应用 |
| 空闲超时 | 5 分钟无交互自动 kill，下次请求重新 spawn | 控制内存占用 |
| 关闭流程 | 应用退出 → SIGTERM → 等 3 秒 → SIGKILL | 优雅关闭优先 |
| 配置隔离 | 通过 `--agent-dir <APP_DATA>/pi-agent/` 指向应用专属目录 | auth.json / models.json 与系统级 pi 配置隔离，支持应用内管理 |

**spawn 命令示例**：
```bash
pi --mode rpc --agent-dir <app_data>/pi-agent [--model <default>] [--provider <default>]
```

MVP 阶段另增加 `--session <id>` 参数启用跨轮对话（见 5.3）。

### 5.2 消息队列管理

pi RPC 子进程一次只能处理一个 prompt。RPC 协议原生支持两种队列动作：

| 模式 | RPC 命令 | 行为 | 适用场景 |
|------|---------|------|---------|
| **中断** | `steer` | 当前 turn 的 tool_call 完成后立即注入新指令 | 用户点击「打断」或快速切换操作 |
| **追加** | `follow_up` | 等待 agent_end 后再送入下一条 | 连续操作（如润色 → 翻译） |

**后端实现**：

```
AgentManager.pending ── VecDeque<(Context, Mode)>

send_prompt(ctx, mode):
  if state == Idle:
    写 prompt 到 stdin → 进入 Streaming
  else:
    push 到 pending 队列 → emit "agent:queued"

on agent_end:
  if pending 不为空:
    pop → 作为 follow_up prompt 发送
  else:
    进入 Idle
```

**前端交互**：

| 用户操作 | 后端行为 | UI 反馈 |
|---------|---------|---------|
| 发送新指令 | 若 Idle → 直接发送；若 Streaming → 入队 | 显示排队序号 |
| 点击「打断」 | `abort` 当前 + 清空 pending + 立即发送新 prompt（steer 模式） | 终止动画，立即开始新输出 |
| Agent 空闲 | — | 命令面板可交互 |
| Agent 忙碌 | — | 按钮变为「打断」，显示流式输出 |

### 5.3 Session 管理

**设计原则**：Session 按文档绑定，不同文档的 Agent 对话上下文彼此独立。

| 决策 | 方案 | 理由 |
|------|------|------|
| Session 粒度 | **每文档一个 session** | 不同文档对话上下文独立，互不污染 |
| 生命周期 | 文档打开 → spawn pi 进程带 `--session <id>`；文档关闭 → fork leaf 保留历史 → shutdown 超时 | 下次打开同文档可继续对话 |
| 持久化位置 | `$APP_DATA/sessions/<doc_hash>.jsonl` | 跟随文档，不跟随应用 |
| 文档重命名 | session 跟随文档 hash 不变；若用户选择「另存为」→ 新文档 = 新 session | 避免 session 断裂 |

**pi 启动参数**：
```bash
pi --mode rpc --agent-dir <app_data>/pi-agent --session <doc_hash>
```

### 5.4 集成架构

```
┌─ React 前端 ──────────────────────────────────────────┐
│  invoke("agent_send")       listen("agent:event")       │
│  invoke("agent_abort")                                 │
└────────────────────┬───────────────────────────────────┘
                     │ Tauri IPC
┌─ Rust 后端 ────────┴───────────────────────────────────┐
│  Tauri Commands                                        │
│    agent_send, agent_abort, agent_get_status           │
│                                                        │
│  State<AgentManager> ── 进程句柄                        │
│    ├── child: Child (pi --mode rpc)                    │
│    ├── state: StateMachine (Idle/Streaming/Dead)       │
│    ├── pending: VecDeque                               │
│    └── sessions: HashMap<DocHash, SessionMeta>         │
│                                                        │
│  stdout 读取 loop (tokio task)                          │
│    → JSONL parse → app_handle.emit("agent:event")      │
└────────────────────────────────────────────────────────┘
```

---

## 6. 关键依赖与技术栈

| 层 | 依赖 | 角色 |
|----|------|------|
| 编辑器引擎 | `@eigenpal/docx-editor-core` | OOXML 解析/渲染/编辑引擎，DocumentAgent，ProseMirror 集成 |
| React 组件 | `@eigenpal/docx-editor-react` | DocxEditor 组件、工具栏、页面渲染 |
| Agent 工具 | `@eigenpal/docx-editor-agents` | AI 工具桥接、DocxReviewer、AgentToolDefinition |
| 国际化 | `@eigenpal/docx-editor-i18n` | 多语言文案管理 |
| Agent 引擎 | `@earendil-works/pi-coding-agent` (SDK) | LLM 调度、会话管理、工具调用 |
| 桌面框架 | Tauri v2 | 窗口管理、文件系统、系统集成 |
| 类型桥梁 | tauri-specta | Rust ↔ TypeScript 类型安全 |
| 前端 | React 19 + Tailwind CSS v4 + shadcn/ui | UI 层