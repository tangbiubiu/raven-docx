# UI 布局对齐规划：前端实现与原型设计对齐

> **状态**: 待实施
> **版本**: v1.0
> **最后更新**: 2026-06-15
> **范围**: MVP 前端布局修复

---

## 1. 背景与问题

### 1.1 项目现状

当前项目已完成部分 MVP 功能，但前端布局实现偏离了原型设计（`.dev/proto/workspace.html`），导致：

- **核心功能缺失**：Agent 对话侧栏（AgentSidebar）未接入页面，用户无法使用 Agent 交互功能
- **交互流程断裂**：快捷操作按钮（QuickActions）位置错误，与 Agent 对话割裂
- **用户体验不一致**：标题栏、大纲面板、菜单栏等组件与原型设计存在明显差异

### 1.2 原型设计参考

- **主工作区原型**：`.dev/proto/workspace.html`（第 1412-1812 行，HTML 结构）
- **设置页原型**：`.dev/proto/settings.html`（第 405-652 行，HTML 结构）
- **设计文档**：`.dev/docs/module-split.md`（模块拆分规范）

### 1.3 修复目标

1. **恢复核心功能**：将 AgentSidebar 接入 WorkspacePage，形成三栏布局（大纲 + 编辑器 + Agent 侧栏）
2. **修复交互流程**：将 QuickActions 移入 AgentSidebar，实现"选中文本 → 快捷操作 → 查看结果"闭环
3. **统一视觉规范**：标题栏、菜单栏、大纲面板等组件对齐原型设计
4. **补齐缺失功能**：QuickActions 按钮数量、大纲折叠恢复入口、状态栏信息

---

## 2. 偏差分析与优先级

### 2.1 严重偏差（🔴 必须修复）

#### 偏差 #1：AgentSidebar 未接入页面

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1725-1786` — 右侧常驻 `.agent-pane` 面板，包含消息列表、快捷操作、输入框 |
| **当前实现** | `src/pages/WorkspacePage.tsx:132-218` — 未渲染 `<AgentSidebar />` 组件 |
| **影响** | 用户无法进行 Agent 对话交互，核心差异化功能（F-056）失效 |
| **修复方案** | 在 WorkspacePage 中添加 `<AgentSidebar />`，形成三栏布局 |

**布局层次对比**：

```
原型设计（三栏）：
┌─────────────────────────────────────────────────────────┐
│ Title Bar (文档名 + 保存状态 + 暗色切换)                │
├─────────────────────────────────────────────────────────┤
│ Menu Bar (文件/编辑/视图/插入/格式/Agent/帮助)          │
├─────────────────────────────────────────────────────────┤
│ Toolbar (格式工具栏)                                    │
├──────────┬──────────────────────┬───────────────────────┤
│ Outline  │ Editor               │ Agent Pane            │
│ Panel    │ (Ruler + EditorPane) │ - Header + Tabs       │
│          │                      │ - Messages            │
│          │                      │ - QuickActions        │
│          │                      │ - Input Row           │
├──────────┴──────────────────────┴───────────────────────┤
│ Status Bar (页码/字数/语言/自动保存/缩放)               │
└─────────────────────────────────────────────────────────┘

当前实现（两栏）：
┌─────────────────────────────────────────────────────────┐
│ DocumentTitleBar (文档名 + 保存状态 + 新建/打开按钮)    │
│ + 右侧操作按钮（模板/主题/批注/设置）                   │
├─────────────────────────────────────────────────────────┤
│ Menu Bar                                                │
├─────────────────────────────────────────────────────────┤
│ Toolbar                                                 │
│ QuickActions (位置错误，应在 Agent Pane 内)             │
├──────────┬──────────────────────────────────────────────┤
│ Outline  │ Editor (Ruler + EditorPane)                  │
│ Panel    │                                              │
│          │                                              │
├──────────┴──────────────────────────────────────────────┤
│ Status Bar (缺少语言标识和自动保存指示)                 │
└─────────────────────────────────────────────────────────┘
```

#### 偏差 #2：QuickActions 位置错误

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1754-1773` — QuickActions 在 Agent Pane 内部，位于消息列表和输入框之间 |
| **当前实现** | `src/pages/WorkspacePage.tsx:172` — QuickActions 在编辑器列（Toolbar 和 Ruler 之间） |
| **影响** | 快捷操作与 Agent 对话割裂，用户无法在一个面板内完成"选中文本 → 快捷操作 → 查看结果"闭环 |
| **修复方案** | 将 `<QuickActions />` 移入 `<AgentSidebar />` 内部 |

#### 偏差 #3：CommentPanel 应为 AgentSidebar 的 Tab

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1729-1732` — Agent Pane 顶部有"对话/批注"两个 Tab，批注面板内嵌在 Agent 侧栏 |
| **当前实现** | `src/pages/WorkspacePage.tsx:179` — CommentPanel 是独立面板，通过标题栏按钮切换 |
| **影响** | 多占一个面板区域，不符合原型设计的空间复用思路 |
| **修复方案** | 在 AgentSidebar 中添加 Tab 切换，将 CommentPanel 内嵌为"批注" Tab |

---

### 2.2 中等偏差（🟡 建议修复）

#### 偏差 #4：标题栏结构不匹配

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1413-1432` — 标题栏仅包含红绿灯、文档名、保存状态、暗色切换 |
| **当前实现** | `src/features/document/components/document-title-bar.tsx` — 包含新建/打开按钮，右侧有模板/主题/批注/设置按钮 |
| **修复方案** | 简化标题栏，移除新建/打开按钮（已在菜单栏中），仅保留文档名 + 保存状态 + 暗色切换 |

**标题栏对比**：

```
原型设计：
┌─────────────────────────────────────────────────────────┐
│ 🔴🟡🟢  · 产品需求文档 PRD · AgentWrite — 已保存   🌙  │
└─────────────────────────────────────────────────────────┘

当前实现：
┌─────────────────────────────────────────────────────────┐
│ 产品需求文档.docx ●          [新建] [打开] 未保存       │
│                                    [模板] [🌙] [批注] [设置] │
└─────────────────────────────────────────────────────────┘
```

#### 偏差 #5：QuickActions 按钮数量不足

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1754-1773` — 8 个按钮：续写(⌘J)、润色(⌘K)、摘要(⌘⇧S)、扩写、翻译、风格检查、转正式、解释 |
| **当前实现** | `src/features/agent/components/quick-actions.tsx:9-14` — 仅 4 个按钮：rewrite、expand、summarize、translate |
| **修复方案** | 补齐 8 个按钮，添加快捷键提示标签 |

**按钮列表对比**：

| 原型设计 | 当前实现 | 状态 |
|---------|---------|------|
| ✏️ 续写 (⌘J) | ❌ 缺失 | 需添加 |
| ✨ 润色 (⌘K) | ✅ rewrite | 已有 |
| 📋 摘要 (⌘⇧S) | ✅ summarize | 已有 |
| 📝 扩写 | ✅ expand | 已有 |
| 🌐 翻译 | ✅ translate | 已有 |
| 🔍 风格检查 | ❌ 缺失 | 需添加 |
| 👔 转正式 | ❌ 缺失 | 需添加 |
| 💡 解释 | ❌ 缺失 | 需添加 |

#### 偏差 #6：大纲面板折叠按钮位置不对

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1575-1581` — 竖向按钮固定在编辑器区域左边缘（`position: absolute; left: 0`） |
| **当前实现** | `src/features/editor/components/OutlinePanel.tsx:37-58` — 折叠按钮在大纲面板头部，折叠后无恢复入口 |
| **修复方案** | 在编辑器区域左边缘添加固定折叠/展开按钮，无论大纲状态如何都可见 |

#### 偏差 #7：菜单栏 Agent 项被禁用

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1441-1446` — Agent 菜单项用 accent 颜色高亮，暗示核心功能 |
| **当前实现** | `src/features/menubar/menu-config.ts:100-106` — Agent 项 `disabled: true` |
| **修复方案** | 移除 `disabled: true`，添加 `highlight: true` 样式标记，实现高亮渲染 |

#### 偏差 #8：状态栏缺少信息

| 项目 | 说明 |
|------|------|
| **原型设计** | `.dev/proto/workspace.html:1790-1811` — 页码、字数、语言（中文(中国)）、自动保存指示、缩放 |
| **当前实现** | `src/features/editor/components/StatusBar.tsx:20-45` — 保存状态、页码、字数、缩放 |
| **修复方案** | 添加语言标识和自动保存指示器 |

**状态栏对比**：

```
原型设计：
┌─────────────────────────────────────────────────────────┐
│ 第 1 页, 共 1 页  字数: 0  中文(中国)  ⬤ 自动保存中   100% ━━━○━━ │
└─────────────────────────────────────────────────────────┘

当前实现：
┌─────────────────────────────────────────────────────────┐
│ 未保存  第 1 页, 共 1 页  字数: 0                 100% ━━━○━━ │
└─────────────────────────────────────────────────────────┘
```

---

### 2.3 可接受的差异（🟢 无需修复）

| 差异项 | 说明 |
|--------|------|
| SettingsDrawer vs 独立页面 | 用抽屉替代独立页面是合理的 UX 选择，不需要改 |
| 原型中"许可与激活"区域 | 需求文档 v0.2.0 已移除此功能（F-160~164），原型未同步更新 |
| 标尺实现 | 当前从 `bridge.getLayout()` 获取尺寸，原型只是静态展示；实现更完整 |

---

## 3. 修复计划

### 3.1 优先级与工作量评估

| 编号 | 修复项 | 优先级 | 复杂度 | 预估工时 | 依赖 |
|------|--------|--------|--------|---------|------|
| #1 | AgentSidebar 接入页面 | 🔴 P0 | 中 | 2h | 无 |
| #2 | QuickActions 移入 AgentSidebar | 🔴 P0 | 低 | 1h | #1 |
| #3 | CommentPanel 内嵌为 Tab | 🔴 P0 | 中 | 2h | #1 |
| #4 | 简化标题栏 | 🟡 P1 | 低 | 1h | 无 |
| #5 | QuickActions 补齐按钮 | 🟡 P1 | 低 | 1h | #2 |
| #6 | 大纲折叠按钮改进 | 🟡 P1 | 低 | 1h | 无 |
| #7 | Agent 菜单项高亮 | 🟡 P1 | 低 | 0.5h | 无 |
| #8 | 状态栏补齐信息 | 🟡 P2 | 低 | 1h | 无 |

**总计**：约 9.5 小时（P0: 5h, P1: 3.5h, P2: 1h）

### 3.2 实施顺序

```
阶段 1：核心布局修复（P0，必须完成）
  ├── #1 AgentSidebar 接入页面
  ├── #2 QuickActions 移入 AgentSidebar
  └── #3 CommentPanel 内嵌为 Tab

阶段 2：视觉规范对齐（P1，建议完成）
  ├── #4 简化标题栏
  ├── #5 QuickActions 补齐按钮
  ├── #6 大纲折叠按钮改进
  └── #7 Agent 菜单项高亮

阶段 3：细节完善（P2，可选）
  └── #8 状态栏补齐信息
```

---

## 4. 详细实施方案

### 4.1 修复 #1：AgentSidebar 接入页面

**目标**：在 WorkspacePage 中添加 `<AgentSidebar />`，形成三栏布局（大纲 + 编辑器 + Agent 侧栏）。

**涉及文件**：
- `src/pages/WorkspacePage.tsx`

**修改要点**：

1. **导入 AgentSidebar 组件**：
   ```tsx
   import { AgentSidebar } from "@/features/agent/components/agent-sidebar";
   ```

2. **调整布局结构**（第 168-180 行）：
   ```tsx
   // 当前：
   <main className="flex flex-1 overflow-hidden">
     <OutlinePanel />
     <div className="relative flex flex-1 flex-col overflow-hidden">
       <Toolbar />
       <QuickActions />
       <Ruler />
       <EditorPane ... />
     </div>
     {commentPanelOpen ? <CommentPanel /> : null}
   </main>

   // 修改后：
   <main className="flex flex-1 overflow-hidden">
     <OutlinePanel />
     <div className="relative flex flex-1 flex-col overflow-hidden">
       <Toolbar />
       <Ruler />
       <EditorPane ... />
     </div>
     <AgentSidebar />
   </main>
   ```

3. **移除独立的 CommentPanel 渲染**（第 179 行）：
   - 删除 `{commentPanelOpen ? <CommentPanel /> : null}`
   - CommentPanel 将在 AgentSidebar 内部作为 Tab 渲染

4. **移除标题栏中的批注按钮**（第 147-153 行）：
   - 删除批注按钮，因为批注功能已内嵌到 AgentSidebar 的 Tab 中

**验证方式**：
- 打开应用，右侧应显示 AgentSidebar
- AgentSidebar 默认显示"对话" Tab
- 可以发送消息并接收 Agent 回复

**测试用例**：
- `src/pages/WorkspacePage.test.tsx`：验证三栏布局渲染
- `src/features/agent/components/agent-sidebar.test.tsx`：验证 AgentSidebar 基本交互

---

### 4.2 修复 #1+#2+#3：三栏布局 + QuickActions + Tab 切换（合并实施）

> **重要**：#1、#2、#3 三项修改涉及相同的文件（`WorkspacePage.tsx` 和 `agent-sidebar.tsx`），
> 必须合并为一个阶段实施，避免中间状态导致渲染异常。

**目标**：
1. WorkspacePage 形成 Outline + Editor + AgentSidebar 三栏布局
2. QuickActions 从编辑器列移入 AgentSidebar 内部（消息列表与输入框之间）
3. AgentSidebar 添加"对话/批注"Tab 切换，CommentPanel 内嵌为"批注" Tab

**涉及文件**：
- `src/pages/WorkspacePage.tsx` — 第 132-218 行
- `src/features/agent/components/agent-sidebar.tsx` — 第 96-292 行
- `src/lib/i18n/zh-CN.ts` — 添加 Tab 翻译键
- `src/lib/i18n/en.ts` — 添加 Tab 翻译键

#### 步骤 1：修改 WorkspacePage.tsx

**1a. 添加导入**（第 6 行附近，import 区域）：
```tsx
// 新增：
import { AgentSidebar } from "@/features/agent/components/agent-sidebar";
```

**1b. 移除不再需要的导入**：
```tsx
// 删除：
import { QuickActions } from "@/features/agent/components/quick-actions";
import { CommentPanel } from "@/features/review/components/comment-panel";
```

**1c. 移除 commentPanelOpen 状态读取**（第 46-47 行）：
```tsx
// 删除：
const commentPanelOpen = useAppStore((s) => s.commentPanelOpen);
const toggleCommentPanel = useAppStore((s) => s.toggleCommentPanel);
```

**1d. 调整 main 布局**（第 168-180 行）：
```tsx
// 当前：
<main className="flex flex-1 overflow-hidden">
  <OutlinePanel />
  <div className="relative flex flex-1 flex-col overflow-hidden">
    <Toolbar />
    <QuickActions />      // ← 删除
    <Ruler />
    <EditorPane
      documentBuffer={documentBuffer}
      isNewDocument={isNewDocument}
    />
  </div>
  {commentPanelOpen ? <CommentPanel /> : null}   // ← 删除
</main>

// 修改后：
<main className="flex flex-1 overflow-hidden">
  <OutlinePanel />
  <div className="relative flex flex-1 flex-col overflow-hidden">
    <Toolbar />
    <Ruler />
    <EditorPane
      documentBuffer={documentBuffer}
      isNewDocument={isNewDocument}
    />
  </div>
  <AgentSidebar />
</main>
```

**1e. 移除标题栏中的批注按钮**（第 147-153 行）：
```tsx
// 删除整个批注按钮：
<button
  className="rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-accent"
  onClick={toggleCommentPanel}
  type="button"
>
  {t("review.title")}
</button>
```

#### 步骤 2：修改 agent-sidebar.tsx

**2a. 添加导入**（第 5-11 行，import 区域）：
```tsx
// 新增：
import { useState } from "react";
import { QuickActions } from "./quick-actions";
import { CommentPanel } from "@/features/review/components/comment-panel";
```

**2b. 在组件内添加 Tab 状态**（第 31 行附近，现有 useState 区域）：
```tsx
// 新增：
const [activeTab, setActiveTab] = useState<"chat" | "comments">("chat");
```

**2c. 修改标题栏，添加 Tab 切换**（第 104-153 行）：

原型参考：`.dev/proto/workspace.html:709-769`（`.agent-header` 结构）

```tsx
// 当前标题栏：
<div className="flex items-center justify-between border-border border-b px-3 py-2">
  <div className="flex items-center gap-2">
    <span className="font-medium text-sm">{t("agent.title")}</span>
    <StatusIndicator status={status} />
  </div>
  <div className="flex items-center gap-1">
    {/* 清空按钮 + 关闭按钮 */}
  </div>
</div>

// 修改后（对齐原型 .agent-header）：
<div className="flex items-center gap-2 border-border border-b px-3 py-2">
  <span className="font-medium text-sm">{t("agent.title")}</span>
  <StatusIndicator status={status} />

  {/* Tab 切换 — 对齐原型 .agent-tabs */}
  <div className="ml-auto flex gap-0.5">
    <button
      type="button"
      onClick={() => setActiveTab("chat")}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] transition-colors",
        activeTab === "chat"
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {t("agent.tab.chat")}
    </button>
    <button
      type="button"
      onClick={() => setActiveTab("comments")}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] transition-colors",
        activeTab === "comments"
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {t("agent.tab.comments")}
    </button>
  </div>

  {/* 上下文徽章 — 对齐原型 .agent-context-badge */}
  {contextBadge && (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/15 px-2 py-0.5 font-mono text-primary text-[10px]">
      {contextBadge.text}
    </span>
  )}

  {/* 清空 + 关闭按钮（保留现有逻辑） */}
  <div className="flex items-center gap-1">
    {/* ... 现有清空和关闭按钮 ... */}
  </div>
</div>
```

**2d. 条件渲染内容区域**（第 156-289 行）：

```tsx
// 当前：消息列表 + 错误提示 + 输入框，始终显示

// 修改后：根据 activeTab 切换
{activeTab === "chat" ? (
  <>
    {/* 消息列表 — 保持现有逻辑（第 156-186 行） */}
    <div className="flex-1 space-y-4 overflow-y-auto p-3">
      {/* ... 现有消息渲染逻辑 ... */}
    </div>

    {/* 错误提示 — 保持现有逻辑（第 188-228 行） */}
    {error && ( /* ... */ )}

    {/* QuickActions — 对齐原型 .quick-actions（第 1754-1773 行） */}
    <QuickActions />

    {/* 输入区域 — 保持现有逻辑（第 230-289 行） */}
    <div className="border-border border-t p-3">
      {/* ... 现有输入框逻辑 ... */}
    </div>
  </>
) : (
  /* 批注 Tab — 内嵌 CommentPanel */
  <CommentPanel embedded />
)}
```

#### 步骤 3：修改 comment-panel.tsx（添加 embedded prop）

**3a. 添加 embedded prop 定义**（第 10 行附近）：
```tsx
// 新增：
type CommentPanelProps = {
  embedded?: boolean;
};

export function CommentPanel({ embedded = false }: CommentPanelProps) {
  // ... 现有逻辑 ...
```

**3b. 条件渲染 aside 外壳**（第 48-54 行）：

**当前实现**：
```tsx
return (
  <aside className="flex h-full w-80 flex-col border-border border-l bg-background">
    {/* ... 内容 ... */}
  </aside>
);
```

**修改后**：
```tsx
const content = (
  <>
    {/* 标题栏 — embedded 模式下隐藏（AgentSidebar 已有标题栏） */}
    {!embedded && (
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">{t("review.title")}</h2>
        <button onClick={togglePanel} aria-label={t("dialog.close")}>
          <svg ... />
        </button>
      </header>
    )}

    {/* 批注列表 + 添加表单 — 保持不变 */}
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {/* ... 现有逻辑 ... */}
    </div>
  </>
);

// embedded 模式：直接渲染内容，无 aside 外壳
if (embedded) {
  return <div className="flex h-full flex-col">{content}</div>;
}

// 独立面板模式：保留 aside 外壳
return (
  <aside className="flex h-full w-80 flex-col border-border border-l bg-background">
    {content}
  </aside>
);
```

**3c. 添加 i18n 键值**（如果缺失）：
```ts
// zh-CN.ts
"review.title": "批注",
"dialog.close": "关闭",
```

#### 步骤 4：添加 i18n 键值

**zh-CN.ts** — agent 区域添加：
```ts
"agent.tab.chat": "对话",
"agent.tab.comments": "批注",
```

**en.ts** — agent 区域添加：
```ts
"agent.tab.chat": "Chat",
"agent.tab.comments": "Comments",
```

#### 验证方式

- 打开应用，右侧显示 AgentSidebar，形成三栏布局
- AgentSidebar 顶部有"对话"和"批注"两个 Tab
- "对话" Tab 下显示消息列表 + QuickActions + 输入框
- "批注" Tab 下显示 CommentPanel
- 选中文本后点击 QuickActions 按钮，结果在消息列表中显示
- 点击关闭按钮，AgentSidebar 折叠为小图标

#### 测试用例

- `src/pages/WorkspacePage.test.tsx`：验证三栏布局渲染、CommentPanel 不再独立渲染
- `src/features/agent/components/agent-sidebar.test.tsx`：验证 Tab 切换、QuickActions 位置
- `src/features/agent/components/quick-actions.test.tsx`：验证按钮点击触发 Agent 操作

---

### 4.3 修复 #3：CommentPanel 内嵌为 Tab

**目标**：在 AgentSidebar 中添加"对话/批注" Tab 切换，将 CommentPanel 内嵌为"批注" Tab。

**涉及文件**：
- `src/features/agent/components/agent-sidebar.tsx`
- `src/stores/useAppStore.ts`（可能需要调整状态管理）

**修改要点**：

1. **添加 Tab 状态**：
   ```tsx
   // 在 AgentSidebar 组件内：
   const [activeTab, setActiveTab] = useState<"chat" | "comments">("chat");
   ```

2. **添加 Tab 切换 UI**（在 AgentSidebar 头部）：
   ```tsx
   <div className="flex items-center justify-between border-b px-3 py-2">
     <div className="flex items-center gap-2">
       <span className="font-medium text-sm">{t("agent.title")}</span>
       <StatusIndicator status={status} />
     </div>

     {/* Tab 切换 */}
     <div className="flex gap-2">
       <button
         type="button"
         onClick={() => setActiveTab("chat")}
         className={cn(
           "px-2 py-1 text-xs rounded",
           activeTab === "chat"
             ? "bg-accent text-accent-foreground"
             : "text-muted-foreground hover:bg-accent/50"
         )}
       >
         {t("agent.tab.chat")}
       </button>
       <button
         type="button"
         onClick={() => setActiveTab("comments")}
         className={cn(
           "px-2 py-1 text-xs rounded",
           activeTab === "comments"
             ? "bg-accent text-accent-foreground"
             : "text-muted-foreground hover:bg-accent/50"
         )}
       >
         {t("agent.tab.comments")}
       </button>
     </div>

     {/* 关闭按钮 */}
     <button onClick={toggle} ...>
       {/* ... */}
     </button>
   </div>
   ```

3. **条件渲染内容区域**：
   ```tsx
   {activeTab === "chat" ? (
     <>
       {/* 消息列表 */}
       <div className="flex-1 overflow-y-auto p-3">
         {/* ... */}
       </div>

       {/* QuickActions */}
       <QuickActions />

       {/* 输入框 */}
       <div className="border-border border-t p-3">
         {/* ... */}
       </div>
     </>
   ) : (
     <CommentPanel />
   )}
   ```

4. **添加 i18n 键值**（`src/lib/i18n/zh-CN.ts` 和 `en.ts`）：
   ```ts
   // zh-CN.ts
   "agent.tab.chat": "对话",
   "agent.tab.comments": "批注",

   // en.ts
   "agent.tab.chat": "Chat",
   "agent.tab.comments": "Comments",
   ```

**验证方式**：
- AgentSidebar 顶部显示"对话"和"批注"两个 Tab
- 点击"批注" Tab，显示 CommentPanel 内容
- 点击"对话" Tab，返回 Agent 对话界面

**测试用例**：
- `src/features/agent/components/agent-sidebar.test.tsx`：验证 Tab 切换功能
- `src/features/review/components/comment-panel.test.tsx`：验证 CommentPanel 在 Tab 内正常工作

---

### 4.4 修复 #4：简化标题栏

**目标**：简化 DocumentTitleBar，移除新建/打开按钮（已在菜单栏中），仅保留文档名 + 保存状态 + 暗色切换。

**涉及文件**：
- `src/features/document/components/document-title-bar.tsx`
- `src/pages/WorkspacePage.tsx`

**修改要点**：

1. **document-title-bar.tsx — 简化组件**：
   ```tsx
   // 移除 onNew / onOpen props
   export function DocumentTitleBar() {
     const { t } = useT();
     const documentPath = useDocumentStore((s) => s.documentPath);
     const isDirty = useDocumentStore((s) => s.isDirty);

     const displayName = documentPath
       ? (documentPath.split("/").pop() ?? documentPath)
       : t("document.unnamed");

     return (
       <div className="flex h-10 shrink-0 items-center justify-between border-border border-b bg-background px-4">
         {/* 左侧：文档名 + 保存状态 */}
         <div className="flex items-center gap-2">
           <span className="text-muted-foreground text-sm">{displayName}</span>
           {isDirty ? (
             <span className="text-muted-foreground text-xs" title={t("document.modified")}>
               ●
             </span>
           ) : null}
         </div>

         {/* 右侧：暗色切换 */}
         <ThemeToggle />
       </div>
     );
   }
   ```

2. **WorkspacePage.tsx — 调整调用**：
   ```tsx
   // 移除模板/批注/设置按钮（第 138-162 行）
   <DocumentTitleBar />
   // 删除右侧操作按钮区域
   ```

3. **添加保存状态文本**（可选）：
   ```tsx
   <div className="flex items-center gap-2">
     <span className="text-muted-foreground text-sm">{displayName}</span>
     <span className="text-muted-foreground text-xs">
       {isDirty ? t("document.unsaved") : t("document.saved")}
     </span>
   </div>
   ```

**验证方式**：
- 标题栏仅显示文档名、保存状态、暗色切换按钮
- 新建/打开功能仍可通过菜单栏访问

**测试用例**：
- `src/features/document/components/document-title-bar.test.tsx`：验证简化后的渲染

---

### 4.5 修复 #5：QuickActions 补齐按钮

**目标**：将 QuickActions 从 4 个按钮补齐到 8 个，添加快捷键提示标签。

**涉及文件**：
- `src/features/agent/components/quick-actions.tsx`

**修改要点**：

1. **更新按钮列表**：
   ```tsx
   const QUICK_ACTIONS = [
     { id: "continue", icon: "✏️", shortcut: "⌘J", labelKey: "agent.action.continueWriting" },
     { id: "rewrite", icon: "✨", shortcut: "⌘K", labelKey: "agent.action.rewrite" },
     { id: "summarize", icon: "📋", shortcut: "⌘⇧S", labelKey: "agent.action.summarize" },
     { id: "expand", icon: "📝", shortcut: null, labelKey: "agent.action.expand" },
     { id: "translate", icon: "🌐", shortcut: null, labelKey: "agent.action.translate" },
     { id: "styleCheck", icon: "🔍", shortcut: null, labelKey: "agent.action.styleCheck" },
     { id: "makeFormal", icon: "👔", shortcut: null, labelKey: "agent.action.makeFormal" },
     { id: "explain", icon: "💡", shortcut: null, labelKey: "agent.action.explain" },
   ] as const;
   ```

2. **调整渲染样式**（参考原型 `.quick-btn`）：
   ```tsx
   return (
     <div className="grid grid-cols-2 gap-2 p-3 border-t border-border">
       {QUICK_ACTIONS.map((action) => (
         <button
           key={action.id}
           type="button"
           onClick={() => handleClick(action.id)}
           className="flex items-center justify-between px-2 py-1.5 text-xs rounded border border-border hover:bg-accent transition-colors"
         >
           <span className="flex items-center gap-1">
             <span>{action.icon}</span>
             <span>{t(action.labelKey)}</span>
           </span>
           {action.shortcut && (
             <span className="text-muted-foreground text-[10px] font-mono">
               {action.shortcut}
             </span>
           )}
         </button>
       ))}
     </div>
   );
   ```

3. **添加 i18n 键值**（如果缺失）：
   ```ts
   // zh-CN.ts
   "agent.action.continueWriting": "续写",
   "agent.action.styleCheck": "风格检查",
   "agent.action.makeFormal": "转正式",
   "agent.action.explain": "解释",

   // en.ts
   "agent.action.continueWriting": "Continue",
   "agent.action.styleCheck": "Style Check",
   "agent.action.makeFormal": "Make Formal",
   "agent.action.explain": "Explain",
   ```

**验证方式**：
- QuickActions 显示 8 个按钮
- 每个按钮显示图标、标签、快捷键（如果有）
- 点击按钮触发对应的 Agent 操作

**测试用例**：
- `src/features/agent/components/quick-actions.test.tsx`：验证 8 个按钮渲染和功能

---

### 4.6 修复 #6：大纲折叠按钮改进

**目标**：在编辑器区域左边缘添加固定折叠/展开按钮，无论大纲状态如何都可见。

**涉及文件**：
- `src/features/editor/components/OutlinePanel.tsx`
- `src/pages/WorkspacePage.tsx`

**修改要点**：

1. **OutlinePanel.tsx — 折叠时显示恢复按钮**：
   ```tsx
   if (collapsed) {
     return (
       <button
         type="button"
         onClick={toggle}
         aria-label={t("editor.outline.expand")}
         className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-[22px] h-12 border border-l-0 border-border rounded-r-md bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
         style={{ writingMode: "vertical-rl" }}
       >
         <span className="text-[11px]">大纲</span>
       </button>
     );
   }
   ```

2. **WorkspacePage.tsx — 调整编辑器区域定位**：
   ```tsx
   <div className="relative flex flex-1 flex-col overflow-hidden">
     <Toolbar />
     <Ruler />
     <EditorPane ... />
   </div>
   ```
   - 确保编辑器区域有 `relative` 定位，以便折叠按钮的 `absolute` 定位生效

3. **OutlinePanel — 展开时头部显示关闭按钮**（当前实现已包含，无需修改）

**验证方式**：
- 大纲折叠后，编辑器左边缘显示竖向"大纲"按钮
- 点击按钮，大纲展开
- 大纲展开时，头部显示关闭按钮（X）

**测试用例**：
- `src/features/editor/components/OutlinePanel.test.tsx`：验证折叠/展开按钮交互

---

### 4.7 修复 #7：Agent 菜单项高亮

**目标**：移除 Agent 菜单项的 `disabled` 状态，添加高亮样式标记。

**涉及文件**：
- `src/features/menubar/menu-config.ts`
- `src/features/menubar/components/menu-bar.tsx`

**修改要点**：

1. **menu-config.ts — 移除 disabled，添加 highlight**：
   ```ts
   // 第 100-106 行
   {
     id: "agent",
     labelKey: "menu.agent",
     items: [
       {
         labelKey: "menu.agent.panel",
         action: "agent:togglePanel",
         highlight: true,  // 新增标记
       },
     ],
   },
   ```

2. **更新 MenuEntry 类型**：
   ```ts
   export type MenuEntry = {
     labelKey?: string;
     shortcut?: string;
     action?: string;
     disabled?: boolean;
     separator?: true;
     highlight?: boolean;  // 新增
   };
   ```

3. **menu-bar.tsx — 实现高亮渲染**：
   ```tsx
   // 在 MenuDropdown 组件中（第 31-74 行）
   <button
     type="button"
     onClick={() => onAction(item.action!)}
     className={cn(
       "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded",
       "hover:bg-accent",
       item.highlight
         ? "text-accent-foreground font-semibold"
         : "text-foreground"
     )}
   >
     <span>{t(item.labelKey!)}</span>
     {item.shortcut && (
       <span className="text-muted-foreground text-xs">{item.shortcut}</span>
     )}
   </button>
   ```

4. **菜单栏顶部渲染 Agent 项时添加高亮**：
   ```tsx
   // 在 MenuBar 组件中（第 80-220 行）
   <span
     className={cn(
       "menu-item",
       group.id === "agent" && "text-accent font-semibold"
     )}
     data-menu={group.id}
   >
     {t(group.labelKey)} ▾
   </span>
   ```

**验证方式**：
- 菜单栏中"Agent"项用 accent 颜色高亮显示
- 下拉菜单中"Agent 面板"项也高亮显示
- 点击"Agent 面板"项，切换 AgentSidebar 显示状态

**测试用例**：
- `src/features/menubar/components/menu-bar.test.tsx`：验证 Agent 菜单项高亮和功能

---

### 4.8 修复 #8：状态栏补齐信息

**目标**：在 StatusBar 中添加语言标识和自动保存指示器。

**涉及文件**：
- `src/features/editor/components/StatusBar.tsx`
- `src/stores/useDocumentStore.ts`（可能需要添加自动保存状态）

**修改要点**：

1. **StatusBar.tsx — 添加语言和自动保存指示**：
   ```tsx
   export function StatusBar() {
     const { t } = useT();
     const currentPage = useDocumentStore((s) => s.currentPage);
     const totalPages = useDocumentStore((s) => s.totalPages);
     const isDirty = useDocumentStore((s) => s.isDirty);
     const charCount = useDocumentStore((s) => s.charCount);
     const isAutoSaving = useDocumentStore((s) => s.isAutoSaving);  // 新增

     return (
       <div
         className="flex h-7 shrink-0 items-center justify-between border-border border-t bg-muted/60 px-4 text-muted-foreground text-xs"
         data-testid="status-bar"
       >
         {/* 左侧：保存状态 + 页码 + 字数 + 语言 */}
         <div className="flex items-center gap-4">
           <span data-testid="dirty-status">
             {isDirty ? t("editor.statusBar.dirty") : t("editor.statusBar.saved")}
           </span>
           <span>
             {t("editor.statusBar.page", { current: currentPage, total: totalPages })}
           </span>
           <span data-testid="word-count">
             {t("editor.statusBar.wordCount", { count: charCount })}
           </span>
           <span>{t("editor.statusBar.language")}</span>
           {isAutoSaving && (
             <span className="text-accent" data-testid="auto-save-indicator">
               ⬤ {t("editor.statusBar.autoSaving")}
             </span>
           )}
         </div>

         {/* 右侧：缩放控制 */}
         <ZoomControl />
       </div>
     );
   }
   ```

2. **useDocumentStore.ts — 添加 isAutoSaving 状态**：
   ```ts
   export type DocumentStore = {
     // ... 现有字段 ...
     isAutoSaving: boolean;  // 新增
     setAutoSaving: (saving: boolean) => void;  // 新增
   };

   export const useDocumentStore = create<DocumentStore>((set) => ({
     // ... 现有字段 ...
     isAutoSaving: false,
     setAutoSaving: (saving) => set({ isAutoSaving: saving }),
   }));
   ```

3. **use-auto-save.ts — 更新自动保存状态**：
   ```ts
   export function useAutoSave() {
     const setAutoSaving = useDocumentStore((s) => s.setAutoSaving);

     // 在自动保存时调用：
     setAutoSaving(true);
     await saveDocument();
     setAutoSaving(false);
   }
   ```

4. **添加 i18n 键值**：
   ```ts
   // zh-CN.ts
   "editor.statusBar.language": "中文(中国)",
   "editor.statusBar.autoSaving": "自动保存中",

   // en.ts
   "editor.statusBar.language": "English (US)",
   "editor.statusBar.autoSaving": "Auto-saving",
   ```

**验证方式**：
- 状态栏显示"中文(中国)"语言标识
- 自动保存时显示"⬤ 自动保存中"指示器（accent 颜色）
- 自动保存完成后，指示器消失

**测试用例**：
- `src/features/editor/components/StatusBar.test.tsx`：验证语言和自动保存指示器渲染
- `src/features/document/hooks/use-auto-save.test.ts`：验证自动保存状态更新

---

## 5. 风险与缓解

### 5.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AgentSidebar 状态管理复杂 | 可能与现有 useAgentStore 冲突 | 优先使用现有 hook，避免重复状态 |
| CommentPanel 内嵌后样式冲突 | 可能影响批注面板布局 | 使用 CSS-in-JS 或 Tailwind 隔离样式 |
| 大纲折叠按钮定位问题 | 可能遮挡编辑器内容 | 使用 `z-index` 和合理的 `padding` 避免遮挡 |

### 5.2 兼容性风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Tauri v2 窗口尺寸限制 | 三栏布局可能在小窗口下溢出 | 添加响应式断点，小窗口时隐藏 AgentSidebar |
| 键盘快捷键冲突 | ⌘K 同时用于命令面板和插入链接 | 命令面板优先级更高，插入链接改用 ⌘⇧K |

### 5.3 测试风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 现有测试失败 | 布局变更可能破坏现有测试 | 修复后运行全量测试，更新失败的测试用例 |
| 新增功能未覆盖 | 新功能可能缺少测试 | 每个修复项都编写对应的测试用例 |

---

## 6. 验收标准

### 6.1 功能验收

- [ ] **三栏布局**：打开应用后，右侧显示 AgentSidebar，形成大纲 + 编辑器 + Agent 三栏布局
- [ ] **Agent 对话**：可以在 AgentSidebar 中发送消息并接收 Agent 回复
- [ ] **QuickActions 位置**：QuickActions 在 AgentSidebar 内部，位于消息列表和输入框之间
- [ ] **QuickActions 功能**：选中文本后，点击 QuickActions 按钮，结果在 AgentSidebar 中显示
- [ ] **Tab 切换**：AgentSidebar 顶部有"对话"和"批注" Tab，点击可切换
- [ ] **批注功能**：在"批注" Tab 中，CommentPanel 正常工作（添加/回复/解决/删除批注）
- [ ] **标题栏简化**：标题栏仅显示文档名、保存状态、暗色切换按钮
- [ ] **QuickActions 补齐**：显示 8 个按钮（续写、润色、摘要、扩写、翻译、风格检查、转正式、解释）
- [ ] **大纲折叠**：大纲折叠后，编辑器左边缘显示恢复按钮
- [ ] **Agent 菜单高亮**：菜单栏中"Agent"项用 accent 颜色高亮显示
- [ ] **状态栏补齐**：显示语言标识和自动保存指示器

### 6.2 视觉验收

- [ ] **布局对齐原型**：三栏布局与 `.dev/proto/workspace.html` 一致
- [ ] **颜色规范**：使用 Tailwind CSS 变量（`bg-background`, `text-foreground`, `bg-accent` 等）
- [ ] **间距规范**：组件间距符合 Tailwind 默认值（`p-3`, `gap-2`, `border-t` 等）
- [ ] **响应式**：窗口宽度 < 1024px 时，AgentSidebar 可折叠

### 6.3 测试验收

- [ ] **单元测试**：所有修改的组件都有对应的测试用例
- [ ] **集成测试**：WorkspacePage 渲染测试通过
- [ ] **E2E 测试**：核心交互流程（选中文本 → QuickActions → 查看结果）测试通过
- [ ] **回归测试**：现有功能（文档编辑、保存、格式设置）未受影响

---

## 7. 附录

### 7.1 相关文件清单

| 文件路径 | 说明 |
|---------|------|
| `.dev/proto/workspace.html` | 主工作区原型（HTML） |
| `.dev/proto/settings.html` | 设置页原型（HTML） |
| `.dev/docs/module-split.md` | 模块拆分规范 |
| `src/pages/WorkspacePage.tsx` | 主工作区页面组件 |
| `src/features/agent/components/agent-sidebar.tsx` | Agent 对话侧栏组件 |
| `src/features/agent/components/quick-actions.tsx` | 快捷操作按钮组件 |
| `src/features/review/components/comment-panel.tsx` | 批注面板组件 |
| `src/features/document/components/document-title-bar.tsx` | 文档标题栏组件 |
| `src/features/editor/components/OutlinePanel.tsx` | 大纲面板组件 |
| `src/features/editor/components/StatusBar.tsx` | 状态栏组件 |
| `src/features/menubar/menu-config.ts` | 菜单配置 |
| `src/features/menubar/components/menu-bar.tsx` | 菜单栏组件 |
| `src/stores/useAppStore.ts` | 应用状态管理 |
| `src/stores/useDocumentStore.ts` | 文档状态管理 |
| `src/lib/i18n/zh-CN.ts` | 中文翻译 |
| `src/lib/i18n/en.ts` | 英文翻译 |

### 7.2 术语表

| 术语 | 说明 |
|------|------|
| AgentSidebar | Agent 对话侧栏，包含消息列表、QuickActions、输入框 |
| QuickActions | 快捷操作按钮，用于快速触发 Agent 操作（润色、扩写等） |
| CommentPanel | 批注面板，用于管理文档批注 |
| OutlinePanel | 大纲面板，显示文档标题树 |
| DocumentTitleBar | 文档标题栏，显示文档名和保存状态 |
| StatusBar | 状态栏，显示页码、字数、缩放等信息 |
| MenuBar | 菜单栏，包含文件、编辑、视图等菜单 |

### 7.3 参考链接

- [需求文档（功能）](../requirements/requirements-functional.md)
- [需求文档（技术）](../requirements/requirements-technical.md)
- [模块拆分规范](../docs/module-split.md)
- [错误状态处理](../docs/error-states.md)

---

## 8. 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-06-15 | 初始版本，完成偏差分析和修复计划 | - |
