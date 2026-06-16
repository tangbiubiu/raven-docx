# Phase 3 分支规划 — Agent 集成 (v2.1)

> **状态**: Step 1-2 ✅ 已完成 | Step 3 ⏳ 待开发
> **基准**: master `a166bd9` (含 pi-backend + agent-chat)

---

## 0. 分支总览

```
wt/phase3-pi-backend ✅ 已合并
    │
wt/phase3-agent-chat ✅ 已合并
    │
    ├── wt/phase3-cmd-palette   ⏳ worktree/phase3-cmd-palette/
    └── wt/phase3-agent-actions ⏳ worktree/phase3-agent-actions/
```

---

## 1. & 2. 已完成分支 (pi-backend + agent-chat)

已合并到 master。产出接口见下方 §5。

---

## 3. Branch: `wt/phase3-cmd-palette` — 命令面板 + 快捷操作

**工作目录**: `worktree/phase3-cmd-palette`
**类型**: 纯前端 TypeScript/React
**依赖**: agent-chat (已合并，`useAgentSession` + `useAgentContext`)

### 3.1 不修改的文件

| 文件 | 原因 |
|------|------|
| `src-tauri/` | 纯前端分支 |
| `src/features/agent/hooks/` | 由 agent-chat 产出，只读引用 |
| `src/features/agent/components/agent-sidebar.tsx` | 已实现，不碰 |
| `src/stores/` | 只读 |
| `src/features/editor/` | 不碰 |
| `src/features/formatting/` | 不碰 |

### 3.2 任务清单

| # | 任务 | 产出文件 |
|---|------|---------|
| 3.3a | `CommandPalette` — Cmd/Ctrl+K 唤起 + 键盘 ↑↓ 导航 + 搜索过滤 | `features/agent/components/CommandPalette.tsx` |
| 3.3b | 预设动作列表（12 个动作，见 §3.3） | `CommandPalette.tsx` |
| 3.3c | 自定义指令输入（自由文本 + Enter 发送） | `CommandPalette.tsx` |
| 3.3d | `QuickActions` — 工具栏快捷操作按钮组 | `features/agent/components/QuickActions.tsx` |
| 3.3e | 无文档时 `requiresDocument: true` 的命令置灰 | `CommandPalette.tsx` |
| 3.3f | 注册键盘事件 + Portal 渲染到 `WorkspacePage.tsx` | `WorkspacePage.tsx` |

### 3.3 预设动作定义

> **关键**：使用 `useAgentContext().buildPrompt(action, ctx)` 生成 prompt，**不要**硬编码中文指令字符串。i18n key 已定义在 `src/lib/i18n/zh-CN.ts`。

```typescript
// 导入路径
import { useAgentSession } from "@/features/agent/hooks/useAgentSession";
import { useAgentContext } from "@/features/agent/hooks/useAgentContext";
import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useAppStore } from "@/stores/useAppStore";

type PresetAction = {
  id: string;              // 对应 useAgentContext.buildPrompt 的 action 参数
  labelKey: string;        // i18n key，如 "agent.action.rewrite"
  icon: string;            // lucide-react icon name (kebab-case)
  requiresSelection: boolean;
  requiresDocument: boolean;
};

const PRESET_ACTIONS: PresetAction[] = [
  { id: "rewrite",        labelKey: "agent.action.rewrite",        icon: "sparkles",           requiresSelection: true,  requiresDocument: true },
  { id: "expand",         labelKey: "agent.action.expand",         icon: "arrow-down-to-line", requiresSelection: true,  requiresDocument: true },
  { id: "summarize",      labelKey: "agent.action.summarize",      icon: "list",              requiresSelection: true,  requiresDocument: true },
  { id: "translate",      labelKey: "agent.action.translate",      icon: "globe",             requiresSelection: true,  requiresDocument: true },
  { id: "explain",        labelKey: "agent.action.explain",        icon: "help-circle",       requiresSelection: true,  requiresDocument: true },
  { id: "fixGrammar",     labelKey: "agent.action.fixGrammar",     icon: "check",             requiresSelection: true,  requiresDocument: true },
  { id: "makeFormal",     labelKey: "agent.action.makeFormal",     icon: "pen-tool",          requiresSelection: true,  requiresDocument: true },
  { id: "makeCasual",     labelKey: "agent.action.makeCasual",     icon: "smile",             requiresSelection: true,  requiresDocument: true },
  { id: "proofread",      labelKey: "agent.action.proofread",      icon: "file-text",         requiresSelection: false, requiresDocument: true },
  { id: "continue",       labelKey: "agent.action.continueWriting",icon: "play",              requiresSelection: false, requiresDocument: true },
  { id: "optimizeLayout", labelKey: "agent.action.formatDoc",      icon: "columns",           requiresSelection: false, requiresDocument: true },
  { id: "custom",         labelKey: "agent.action.custom",         icon: "mic",               requiresSelection: false, requiresDocument: false },
];
```

**使用 i18n 获取标签**：
```tsx
const { t } = useT();
<span>{t("agent.action.rewrite")}</span>  // "润色" or "Polish"
```

### 3.4 WorkspacePage 集成

在 `src/pages/WorkspacePage.tsx` 中添加：

```tsx
// 导入
import { useAppStore } from "@/stores/useAppStore";
import { CommandPalette } from "@/features/agent/components/CommandPalette";
import { QuickActions } from "@/features/agent/components/QuickActions";

// 在组件内
const activeModal = useAppStore(s => s.activeModal);
const openModal = useAppStore(s => s.openModal);
const closeModal = useAppStore(s => s.closeModal);

// 键盘事件
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k" && !e.shiftKey) {
      e.preventDefault();
      openModal("commandPalette");
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [openModal]);

// JSX 中渲染
{activeModal === "commandPalette" ? <CommandPalette /> : null}
{/* Toolbar 下方 */}
<QuickActions />
```

### 3.5 CommandPalette 组件结构

```
CommandPalette (Portal)
├── 遮罩层 fixed inset-0 bg-black/50 z-50 (onClick → closeModal)
│   └── 面板 fixed top-1/4 left-1/2 -translate-x-1/2 w-[560px] z-50
│       ├── 搜索框 input autoFocus
│       │     placeholder: t("agent.cmdPalette.placeholder")  // "输入指令或搜索…"
│       ├── 预设动作列表 (filtered by search input)
│       │     每项: icon + t(labelKey) + description
│       │     置灰: requiresDocument && !documentPath
│       │     置灰: requiresSelection && !getSelectionContext()
│       └── 自定义输入 (选中 "custom" 或输入无匹配时)
│             输入框 + Enter 发送
```

### 3.6 键盘导航

| 按键 | 行为 |
|------|------|
| ↑↓ | 移动高亮项 |
| Enter | 执行选中项 / 发送自定义输入 |
| Esc | closeModal() |

### 3.7 执行动作

```typescript
const { send, isStreaming } = useAgentSession();
const { getSelectionContext, buildPrompt } = useAgentContext();
const documentPath = useDocumentStore(s => s.documentPath);

const executeAction = async (action: PresetAction) => {
  if (action.requiresDocument && !documentPath) return;
  const ctx = getSelectionContext();
  if (action.requiresSelection && !ctx) return;
  closeModal();
  await send(buildPrompt(action.id, ctx));
};
```

### 3.8 QuickActions

简化的预设动作按钮组（仅 4 个：润色/扩写/摘要/翻译），置于 Toolbar 下方。

```tsx
export function QuickActions() {
  const { send, isStreaming } = useAgentSession();
  const { getSelectionContext, buildPrompt } = useAgentContext();
  const { t } = useT();
  return (
    <div className="flex gap-1 px-2 py-1">
      {["rewrite","expand","summarize","translate"].map(id => (
        <button key={id} onClick={async () => {
          const ctx = getSelectionContext();
          if (!ctx) return;
          await send(buildPrompt(id, ctx), isStreaming ? "steer" : "default");
        }}>
          {t(`agent.action.${id}`)}
        </button>
      ))}
    </div>
  );
}
```

### 3.9 测试重点

- Cmd+K → 面板弹出 → 搜索框自动聚焦
- 无选区选择"润色" → 不执行操作
- 无文档打开 → `requiresDocument: true` 的命令置灰
- Esc → 面板关闭
- 输入"翻译成英文" → Enter → `agent_send` 被调用
- QuickActions 按钮 click → 对应预设动作触发

---

## 4. Branch: `wt/phase3-agent-actions` — Agent 动作执行

**工作目录**: `worktree/phase3-agent-actions`
**类型**: 纯前端 TypeScript/React
**依赖**: agent-chat (已合并) + Phase 2 (`useEditorBridge`)

### 4.1 不修改的文件

| 文件 | 原因 |
|------|------|
| `src-tauri/` | 纯前端分支 |
| `src/features/agent/components/agent-sidebar.tsx` | 已实现，不碰 |
| `src/features/agent/hooks/useAgentSession.ts` | 已实现，只读 |
| `src/features/agent/hooks/useAgentContext.ts` | 已实现，只读 |
| `src/stores/` | 只读 |
| `src/features/formatting/` | 不碰 |

### 4.2 任务清单

| # | 任务 | 产出文件 |
|---|------|---------|
| 4.2a | `useAgentCommands` — Agent 响应解析 + 命令执行 + 回滚 | `features/agent/hooks/useAgentCommands.ts` |
| 4.2b | `SuggestionPopover` — 建议预览/接受/拒绝浮动卡片 | `features/agent/components/SuggestionPopover.tsx` |
| 4.2c | 润色/翻译/扩写/风格转换 → `editorBridge.dispatchTransaction` 文本替换 | `useAgentCommands.ts` |
| 4.2d | 全文校对 → `getAgent().executeCommands()` 批量应用 | `useAgentCommands.ts` |
| 4.2e | 排版优化 → 结构化 `AgentCommand[]` 批量执行 | `useAgentCommands.ts` |
| 4.2f | 错误回滚：`save()` 快照 → `setDocument()` 恢复 | `useAgentCommands.ts` |

### 4.3 useAgentCommands Hook

新建 `features/agent/hooks/useAgentCommands.ts`：

```typescript
// 消费的接口
import { useAgentSession } from "@/features/agent/hooks/useAgentSession";
import { useAgentContext } from "@/features/agent/hooks/useAgentContext";
import { useDocumentStore } from "@/stores/useDocumentStore";
import type { EditorBridge } from "@/stores/useDocumentStore";
import type { AgentSelectionContext } from "@/features/agent/hooks/useAgentContext";

type AgentActionType =
  | "rewrite" | "expand" | "summarize" | "translate"
  | "explain" | "fixGrammar" | "makeFormal" | "makeCasual"
  | "proofread" | "optimizeLayout";

interface AgentResponse {
  success: boolean;
  newText?: string;
  commands?: AgentCommand[];
  error?: string;
}

// DocumentAgent 命令（来自 @eigenpal/docx-editor-agents）
interface AgentCommand { type: string; [key: string]: unknown; }

interface UseAgentCommandsReturn {
  execute(action: AgentActionType, selectionCtx: AgentSelectionContext | null, customPrompt?: string): Promise<void>;
  parseResponse(text: string): AgentResponse;
  applyResponse(response: AgentResponse): Promise<void>;
  rollback(): Promise<void>;
  hasPendingSuggestion: boolean;
  pendingSuggestion: { originalText: string; suggestedText: string; action: AgentActionType } | null;
  acceptSuggestion(): Promise<void>;
  rejectSuggestion(): void;
}
```

**实现策略**：
1. `execute` → `buildPrompt(action, ctx)` → `send(prompt)` → 等待 `agent_end`
2. 在 `agent_end` 后从最后一条 Agent 消息中 `parseResponse`
3. `parseResponse` 尝试提取 JSON（```json fence），退化时视为 `newText`
4. `applyResponse` → 若 `newText` → `dispatchTransaction` 替换选区；若 `commands` → `getAgent().executeCommands()`

### 4.4 EditorBridge 集成

从 `useDocumentStore((s) => s.editorBridge)` 获取，以下方法已实现：

| 方法 | 用途 |
|------|------|
| `getAgent()` → `{ executeCommands(cmds) }` | 执行 DocumentAgent 命令 |
| `getEditorView()` → ProseMirror EditorView | 获取 PM view 做文本替换 |
| `dispatchTransaction(tr)` | 分发 PM 事务 |
| `save()` → `ArrayBuffer` | 操作前快照 |
| `getSelectionInfo()` → `SelectionInfo` | 选区位置 |

**文本替换**（润色/扩写/翻译等）：
```typescript
const view = editorBridge?.getEditorView();
if (view && response.newText) {
  const { state } = view;
  const tr = state.tr.replaceWith(
    selectionInfo.from,
    selectionInfo.to,
    state.schema.text(response.newText)
  );
  editorBridge.dispatchTransaction(tr);
}
```

**命令批量执行**（全文校对/排版优化）：
```typescript
const agent = editorBridge?.getAgent() as { executeCommands(cmds: unknown[]): Promise<void> };
if (agent && response.commands) {
  await agent.executeCommands(response.commands);
}
```

### 4.5 错误回滚

```typescript
const snapshot = await editorBridge?.save();
try {
  await applyResponse(response);
} catch (e) {
  if (snapshot) {
    // 通过重新加载快照 Buffer 恢复
    useDocumentStore.getState().setDocument(null, snapshot, documentPath);
  }
}
```

> **约束**：ProseMirror Plugin 系统要求通过 `dispatchTransaction` 分发事务，不能直接修改 DOM。

### 4.6 SuggestionPopover

浮动卡片，位置根据 `selectionInfo` 计算：

- 内容：原文本（删除线灰色）+ 建议文本（绿色高亮）
- 操作：接受（✓）→ `acceptSuggestion()` → 替换文本；拒绝（✗）→ `rejectSuggestion()`
- 无选区时不渲染
- 批量校对：逐条呈现，接受/拒绝后自动跳到下一条

### 4.7 测试重点

- Agent 返回 `newText` → `dispatchTransaction` → 编辑器文本变更
- Agent 返回 `AgentCommand[]` → `getAgent().executeCommands()` 逐个应用
- 命令执行失败 → 快照恢复，编辑器状态不变
- `SuggestionPopover`：接受 → 应用变更；拒绝 → 不变

---

## 5. 共享接口对齐清单

以下类型已在 `master` 上实现，两个后续分支直接 import：

| 类型 | Import 路径 | 消费方 |
|------|-----------|--------|
| `useAgentSession` | `@/features/agent/hooks/useAgentSession` | cmd-palette, agent-actions |
| `AgentSendMode` | `@/features/agent/hooks/useAgentSession` | cmd-palette, agent-actions |
| `UseAgentSessionReturn` | `@/features/agent/hooks/useAgentSession` | cmd-palette, agent-actions |
| `useAgentContext` | `@/features/agent/hooks/useAgentContext` | cmd-palette, agent-actions |
| `AgentContext` | `@/features/agent/hooks/useAgentContext` | agent-actions |
| `AgentSelectionContext` | `@/features/agent/hooks/useAgentContext` | cmd-palette, agent-actions |
| `UseAgentContextReturn` | `@/features/agent/hooks/useAgentContext` | cmd-palette, agent-actions |
| `AgentSessionStatus` | `@/stores/useAgentStore` | 所有 |
| `AgentMessage` | `@/stores/useAgentStore` | 所有 |
| `EditorBridge` | `@/stores/useDocumentStore` | agent-actions |
| `SelectionInfo` | `@/stores/useDocumentStore` | agent-actions |

### i18n Key（已定义，直接使用）

```
// Agent 动作
"agent.action.rewrite"       "agent.action.expand"        "agent.action.summarize"
"agent.action.translate"     "agent.action.explain"       "agent.action.fixGrammar"
"agent.action.makeFormal"    "agent.action.makeCasual"    "agent.action.custom"
"agent.action.continueWriting" "agent.action.formatDoc"   "agent.action.proofread"

// 命令面板
"agent.cmdPalette.placeholder"   // "输入指令或搜索…"
"agent.cmdPalette.empty"         // "输入自然语言指令操作文档"

// 通知
"agent.status.idle" / "thinking" / "writing" / "error"

// 通用
"dialog.confirm" / "dialog.cancel" / "dialog.close"
```

> 使用方式：`const { t } = useT(); t("agent.action.rewrite")`。

### 编辑器工具函数（已导出）

```typescript
import {
  extractHeadings, hasTables, hasImages,
  extractAvailableStyles, detectVariables, countParagraphs,
} from "@/features/editor/utils";
```

---

## 6. 合并流程

```
Step 1: ✅ 合并 wt/phase3-pi-backend → master
Step 2: ✅ 合并 wt/phase3-agent-chat → master
Step 3: ⏳ 合并 wt/phase3-cmd-palette + wt/phase3-agent-actions → master
        ├── 并行合并（修改文件不同，无冲突）
        │     cmd-palette: CommandPalette.tsx, QuickActions.tsx, WorkspacePage.tsx
        │     agent-actions: useAgentCommands.ts, SuggestionPopover.tsx
        └── 验证: typecheck + test + tauri dev
Step 4: 清理 worktree + 删除分支
```

```bash
# 清理命令
git worktree remove worktree/phase3-cmd-palette --force
git worktree remove worktree/phase3-agent-actions --force
git branch -d wt/phase3-cmd-palette wt/phase3-agent-actions
```
