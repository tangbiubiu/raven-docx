# features/agent — Agent 交互（核心差异化）

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-050~05B
> **依赖**：`@eigenpal/docx-editor-agents`（DocxReviewer, AgentToolDefinition）
> **通信**：前端 → Tauri `commands/pi_agent.rs` → pi spawn（JSONL stdin/stdout）
> **状态**：草案

---

## 1. 模块结构

```
features/agent/
├── components/
│   ├── AgentSidebar.tsx          # Agent 对话侧栏（含 tabs: 对话/批注）
│   ├── AgentMessageBubble.tsx    # 单条消息气泡（agent/user）
│   ├── CommandPalette.tsx        # Cmd+K 命令面板
│   ├── QuickActions.tsx          # 快捷操作按钮组
│   └── SuggestionPopover.tsx     # 内联建议浮层（接受/拒绝）
├── hooks/
│   ├── useAgentSession.ts        # pi agent 会话生命周期（spawn/abort/events）
│   ├── useAgentContext.ts        # 选区上下文收集 → 构建 AIActionRequest
│   └── useAgentCommands.ts       # Agent 响应解析 → AgentCommand[] 执行
└── types.ts                      # 契约文件（见下文 §3）
```

---

## 2. 组件契约

### AgentSidebar

```typescript
// 无 props
// 结构：
// ┌─────────────────────────────┐
// │ [Avatar] Agent 写作助手      │  ← AgentHeader
// │          [对话] [批注]        │  ← Tabs
// │          光标: §4.2           │  ← context badge
// ├─────────────────────────────┤
// │ 消息列表...                   │  ← AgentMessageBubble[]
// │ 批注列表... (Tab 2)           │  ← CommentPanel (from features/review)
// ├─────────────────────────────┤
// │ [续写] [润色] [摘要] [扩写]   │  ← QuickActions
// │ [翻译] [风格检查] [转正式]...  │
// ├─────────────────────────────┤
// │ [________________] [→]       │  ← 输入框 + 发送按钮
// └─────────────────────────────┘
```

交互：
- 输入框 Enter 发送 → `useAgentSession.sendMessage(text)`
- QuickActions 点击 → 根据 action 构建 `AIActionRequest` → `useAgentSession.sendAction(request)`
- Agent 流式响应 → `useAgentStore` 更新消息列表

### CommandPalette

```typescript
// Portal 组件，Cmd+K 唤起
// 搜索栏 + 命令列表

// 预设命令：
//   "在光标处续写"       → action: continue
//   "润色选中文字"       → action: polish
//   "生成摘要"           → action: summarize
//   "扩写选中段落"       → action: expand
//   "翻译成英文/中文"     → action: translate:{lang}
//   "转正式风格"          → action: makeFormal
//   "转随意风格"          → action: makeCasual
//   "修复语法"           → action: fixGrammar
//   "解释选中文字"        → action: explain
//   "全文排版优化"        → action: autoFormat
//   自由输入...          → action: custom

// 键盘导航：↑↓ 切换、Enter 选中、Esc 关闭
```

### QuickActions

```typescript
// 预设快捷操作按钮组，点击后直接调用对应 action
interface QuickActionsProps {
  onAction: (action: AIAction, prompt?: string) => void;
  disabled: boolean;   // 无文档时禁用
}
```

### SuggestionPopover

```typescript
// 当用户点击 agent-suggestion 标记时显示
// 位置跟随高亮区域
interface SuggestionPopoverProps {
  visible: boolean;
  position: { x: number; y: number };
  onAccept: () => void;
  onReject: () => void;
}
```

---

## 3. 契约文件 `types.ts`

```typescript
// features/agent/types.ts

// ===== 预设 AI 动作 =====
type AIAction =
  | "askAI"        // 自由问答
  | "rewrite"      // 重写
  | "expand"       // 扩写
  | "summarize"    // 总结
  | "translate"    // 翻译
  | "explain"      // 解释含义
  | "fixGrammar"   // 修复语法
  | "makeFormal"   // 转正式
  | "makeCasual"   // 转随意
  | "continue"     // 从光标续写
  | "autoFormat"   // 全文排版优化
  | "styleCheck"   // 全文风格检查
  | "custom";      // 自定义指令

// ===== 前端 → Agent 请求 =====
interface AIActionRequest {
  action: AIAction;
  context: AgentSelectionContext;
  customPrompt?: string;
  targetLanguage?: string;       // "zh-CN" | "en" | "ja" ...
  options?: Record<string, unknown>;
}

interface AgentSelectionContext {
  selectedText: string;
  textBefore: string;            // 选区前 200 字符
  textAfter: string;             // 选区后 200 字符
  paragraph: ParagraphContext;
  formatting: Partial<TextFormatting>;
  inTable?: boolean;
  inHyperlink?: boolean;
  range: Range;
}

// ===== Agent 消息 =====
interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  isStreaming: boolean;          // 是否还在流式输出中
  actions?: AgentResponseAction[]; // Agent 返回的操作按钮
}

interface AgentResponseAction {
  type: "accept" | "reject" | "apply" | "dismiss";
  label: string;                 // 按钮文案
  command?: AgentCommand;        // 关联的结构化命令
}

// ===== Agent 响应 =====
interface AgentResponse {
  success: boolean;
  newText?: string;
  newContent?: AgentContent[];
  commands?: AgentCommand[];
  metadata?: Record<string, unknown>;
  warnings?: string[];
  error?: string;
}

// ===== 会话状态 =====
type AgentSessionStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "busy"        // 正在调用 LLM
  | "error";

// ===== 上下文 badge =====
interface AgentContextBadge {
  label: string;         // "光标: §4.2" / "已选: 32 字" / "全文"
  type: "cursor" | "selection" | "full";
}
```

---

## 4. Hook 契约

### useAgentSession

```typescript
interface UseAgentSessionReturn {
  status: AgentSessionStatus;
  contextBadge: AgentContextBadge;

  // 生命周期
  connect(): Promise<void>;        // spawn pi 子进程
  disconnect(): void;              // kill 子进程
  abort(): void;                   // 中止当前请求

  // 交互
  sendMessage(text: string): void;       // 自由对话
  sendAction(request: AIActionRequest): void; // 预设动作
}
```

实现：
- `connect()` 调用 Tauri `pi_spawn()` → 初始化会话
- `sendMessage/sendAction` 构建 prompt（注入上下文） → Tauri `pi_send(json)`
- 监听 Tauri Event `pi-event` → 流式更新 `useAgentStore.messages`
- `pi_event` 类型：`text_delta` | `tool_execution` | `agent_end` | `error`

### useAgentContext

```typescript
interface UseAgentContextReturn {
  getSelectionContext(): AgentSelectionContext | null;
  getFullContext(): AgentContext;              // 全文上下文
  buildPrompt(request: AIActionRequest): string; // 构建最终 prompt
}

function useAgentContext(): UseAgentContextReturn;
```

Prompt 构建策略（见 TSS §4.4）：
1. 短文本操作：嵌入选区 + 前后文 + 格式信息
2. 全文操作：嵌入大纲 + `AgentCommand` schema
3. 所有 prompt 包含：当前语言、文档标题、光标位置章节

### useAgentCommands

```typescript
interface UseAgentCommandsReturn {
  parseResponse(response: AgentResponse): void;
  applyCommands(commands: AgentCommand[]): void;
  previewChange(command: AgentCommand): TrackedChangeInfo | null; // 生成预览
}

function useAgentCommands(): UseAgentCommandsReturn;
```

`applyCommands` 内部调用 `bridge.getAgent().executeCommands(commands)`。

---

## 5. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useAgentStore` | `setStatus()`, `addMessage()`, `updateMessage()`, `setContextBadge()` | `messages`, `status` |
| `useDocumentStore` | 无 | `editorBridge`, `document` |

---

## 6. Tauri 依赖

| 命令 | 用途 |
|------|------|
| `pi_spawn()` | spawn `pi --mode rpc` 子进程 |
| `pi_send(json: string)` | 向 pi stdin 写 JSON 命令 |
| `pi_abort()` | 向 pi 发送 abort 命令 |
| `pi_get_status()` → `PiStatus` | 查询子进程状态 |

Tauri Event（Rust → Frontend）：
| Event | Payload | 说明 |
|-------|---------|------|
| `pi:text_delta` | `{ text: string }` | 流式文本增量 |
| `pi:tool_call` | `{ name: string, args: object }` | 工具调用 |
| `pi:tool_result` | `{ name: string, result: object }` | 工具结果 |
| `pi:agent_end` | `{}` | Agent 完成 |
| `pi:error` | `{ message: string }` | 错误 |

---

## 7. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `agent.title` | Agent 写作助手 | Agent Writing Assistant |
| `agent.tabChat` | 对话 | Chat |
| `agent.tabComments` | 批注 | Comments |
| `agent.placeholder` | 告诉 Agent 你需要什么… | Tell the Agent what you need… |
| `agent.ready` | Agent 就绪 | Agent Ready |
| `agent.connecting` | 连接中… | Connecting… |
| `agent.error` | Agent 不可用：{error} | Agent unavailable: {error} |
| `agent.cursorAt` | 光标: {section} | Cursor: {section} |
| `agent.selected` | 已选: {count} 字 | Selected: {count} chars |
| `agent.fullDoc` | 全文 | Full Document |
| `agent.continue` | 续写 | Continue |
| `agent.polish` | 润色 | Polish |
| `agent.summarize` | 摘要 | Summarize |
| `agent.expand` | 扩写 | Expand |
| `agent.translate` | 翻译 | Translate |
| `agent.styleCheck` | 风格检查 | Style Check |
| `agent.makeFormal` | 转正式 | Make Formal |
| `agent.explain` | 解释 | Explain |
| `agent.cmdPalette` | 输入指令… | Type a command… |
| `agent.noCommands` | 无匹配命令 | No matching commands |
