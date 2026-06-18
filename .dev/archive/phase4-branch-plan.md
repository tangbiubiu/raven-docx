# Phase 4 分支规划 — 完善

> **状态**: 规划中
> **基准**: master `87f1bc9` (Phase 3 + P2 修复)
> **分支**: 5 个并行 worktree，无相互依赖
>
> **文档路线**：
> - 功能需求 → [FRS](../requirements/requirements-functional.md)
> - 模块拆分 → [mod-split](../docs/module-split.md)
> - UI 原型 → [workspace.html](../proto/workspace.html)
> - 实施计划 → [implementation-plan.md](./implementation-plan.md)

---

## 0. 分支总览

```
master (87f1bc9)
  ├── wt/phase4-table-refs   表格 + 图片 + 超链接 + 脚注
  ├── wt/phase4-page-layout  页面设置 + 页眉页脚
  ├── wt/phase4-review       批注 + 修订建议
  ├── wt/phase4-template     模板变量
  └── wt/phase4-polish       快捷键/暗色/查找替换/自动保存/打印
```

---

## 1. wt/phase4-table-refs — 表格 + 图片 + 引用

**工作目录**: `worktree/phase4-table-refs`
**类型**: 纯前端 TypeScript/React
**依赖**: Phase 2 (`useEditorBridge` / `EditorBridge`)

### 1.1 任务清单

| # | 任务 | 产出 | 参考文档 |
|---|------|------|----------|
| 4.1a | `InsertTableGrid` — 网格选择行列数 + `DocumentAgent.insertTable` | `features/table/components/InsertTableGrid.tsx` | [FRS 表格 F-080](../requirements/requirements-functional.md) · [mod-split §3.4](../docs/module-split.md) · [原型 #table-modal line 1863](../proto/workspace.html) |
| 4.1b | `TableContextMenu` — 右键菜单：插入/删除行列、合并/拆分 | `features/table/components/TableContextMenu.tsx` | [FRS 表格 F-082~086](../requirements/requirements-functional.md) · [mod-split §3.4](../docs/module-split.md) |
| 4.1c | `useTableOperations` — `getAgent().insertTable / deleteRow / mergeCells` | `features/table/hooks/useTableOperations.ts` | [FRS 表格 F-080~086](../requirements/requirements-functional.md) · [mod-split §3.4](../docs/module-split.md) |
| 4.1d | `InsertImageButton` — 隐藏 `<input type="file">` 触发系统选择器 | `features/table/components/InsertImageButton.tsx` | [FRS 图片 F-090](../requirements/requirements-functional.md) · [原型 toolbar #btn-image line 1552](../proto/workspace.html) |
| 4.1e | `HyperlinkDialog` — 插入/编辑超链接（URL + 显示文本） | `features/table/components/HyperlinkDialog.tsx` | [FRS 引用 F-110](../requirements/requirements-functional.md) · [原型 #link-modal line 1905](../proto/workspace.html) |
| 4.1f | `FootnoteDialog` — 插入脚注 | `features/table/components/FootnoteDialog.tsx` | [FRS 引用 F-111](../requirements/requirements-functional.md) |
| 4.1g | Toolbar 集成：在工具栏添加「⊞ 插入表格」「🖼 插入图片」「🔗 插入链接」按钮 | 修改 `Toolbar.tsx` | [原型 toolbar line 1551-1553](../proto/workspace.html) · [mod-split §1 整体结构](../docs/module-split.md) |

### 1.2 图片插入实现方式

原型使用隐藏 `<input type="file" accept="image/*">` + Toolbar 按钮 click 触发。**不建 Dialog**：

```tsx
// InsertImageButton.tsx
const fileInputRef = useRef<HTMLInputElement>(null);
const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const agent = bridge?.getAgent();
  await agent?.insertImage(file.path ?? file.name);
};
return (
  <>
    <button onClick={() => fileInputRef.current?.click()}>🖼</button>
    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
  </>
);
```

### 1.3 关键接口

```typescript
// EditorBridge 已实现的方法（Phase 2）
const bridge = useDocumentStore(s => s.editorBridge);
const agent = bridge?.getAgent() as {
  insertTable(rows: number, cols: number): Promise<void>;
  insertImage(path: string): Promise<void>;
  insertHyperlink(url: string, text: string): Promise<void>;
  insertFootnote(): Promise<void>;
};
```

> `DocumentAgent` 的表格/图片/超链接方法来自 `@eigenpal/docx-editor-agents`。若包未提供对应 API，改为纯前端 UI 占位。

### 1.4 不修改的文件

- `src-tauri/` — 纯前端
- `src/stores/` — 只读
- `src/features/agent/` — 不碰
- `src/features/formatting/` — 只读

---

## 2. wt/phase4-page-layout — 页面布局

**工作目录**: `worktree/phase4-page-layout`
**类型**: 纯前端 TypeScript/React
**依赖**: Phase 2 (`useEditorBridge`)

> ⚠️ 原型中无此 Dialog 的设计稿。需自行设计 UI，参考 Word / Pages 的页面设置面板。

### 2.1 任务清单

| # | 任务 | 产出 | 参考文档 |
|---|------|------|----------|
| 4.2a | `PageSetupDialog` — 页边距/纸张大小/方向设置 | `features/page-layout/components/PageSetupDialog.tsx` | [FRS 页面布局 F-100~102](../requirements/requirements-functional.md) · [mod-split §3.5](../docs/module-split.md) |
| 4.2b | `usePageSetup` — 读写 `SectionProperties` | `features/page-layout/hooks/usePageSetup.ts` | [FRS 页面布局 F-100~102](../requirements/requirements-functional.md) · [mod-split §3.5](../docs/module-split.md) |
| 4.2c | `HeaderFooterEditor` — 页眉/页脚编辑区域 + 页码字段 | `features/page-layout/components/HeaderFooterEditor.tsx` | [FRS 页面布局 F-103~104](../requirements/requirements-functional.md) |
| 4.2d | WorkspacePage 集成：「页面设置」入口 + 弹窗 | 修改 `WorkspacePage.tsx` | [mod-split §1 整体结构](../docs/module-split.md) |

### 2.2 关键接口

```typescript
const bridge = useDocumentStore(s => s.editorBridge);
const layout = bridge?.getLayout() as {
  getMargins(): { top: number; right: number; bottom: number; left: number };
  setMargins(m: Margins): void;
  getPageSize(): { width: number; height: number };
  setPageSize(w: number, h: number): void;
  setOrientation(orientation: "portrait" | "landscape"): void;
};
```

> `getLayout()` 方法已声明在 `EditorBridge` 中（Phase 2）。若未实现，改为前端 Dialog 收集参数后通过 `DocumentAgent` 设置 SectionProperties。

### 2.3 不修改的文件

- `src-tauri/` — 纯前端
- `src/stores/` — 只读
- `src/features/agent/` — 不碰

---

## 3. wt/phase4-review — 审阅与批注

**工作目录**: `worktree/phase4-review`
**类型**: 纯前端 TypeScript/React
**依赖**: Phase 2 (`useEditorBridge`)

> ⚠️ 原型中无批注面板的设计稿。需自行设计，参考 Word / Notion 的评论侧栏布局。

### 3.1 任务清单

| # | 任务 | 产出 | 参考文档 |
|---|------|------|----------|
| 4.3a | `CommentPanel` — 右侧批注列表面板 | `features/review/components/CommentPanel.tsx` | [FRS 审阅 F-122](../requirements/requirements-functional.md) · [mod-split §3.7](../docs/module-split.md) |
| 4.3b | `CommentCard` — 单条批注（作者/时间/内容/回复/解决） | `features/review/components/CommentCard.tsx` | [FRS 审阅 F-120](../requirements/requirements-functional.md) · [mod-split §3.7](../docs/module-split.md) |
| 4.3c | `useComments` — 增删改查批注 + `DocumentAgent.addComment` | `features/review/hooks/useComments.ts` | [FRS 审阅 F-120~122](../requirements/requirements-functional.md) · [mod-split §3.7](../docs/module-split.md) |
| 4.3d | WorkspacePage 集成：右侧批注面板 toggle | 修改 `WorkspacePage.tsx` | [mod-split §1 整体结构](../docs/module-split.md) |

### 3.2 关键接口

```typescript
const bridge = useDocumentStore(s => s.editorBridge);
const agent = bridge?.getAgent() as {
  addComment(text: string, range?: { from: number; to: number }): Promise<void>;
  replyToComment(commentId: string, text: string): Promise<void>;
  resolveComment(commentId: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
};
```

> 批注 API 依赖 `@eigenpal/docx-editor-agents`。若包未提供，改为纯前端 UI 占位。

### 3.3 不修改的文件

- `src-tauri/` — 纯前端
- `src/stores/` — 只读
- `src/features/agent/` — 不碰
- `src/features/formatting/` — 不碰

---

## 4. wt/phase4-template — 模板变量

**工作目录**: `worktree/phase4-template`
**类型**: 纯前端 TypeScript/React
**依赖**: Phase 2 (`useEditorBridge`) + `editor/utils.ts` (`detectVariables`)

### 4.1 任务清单

| # | 任务 | 产出 | 参考文档 |
|---|------|------|----------|
| 4.4a | `VariableForm` — 变量列表 + 输入填充表单 | `features/template/components/VariableForm.tsx` | [FRS 模板 F-131](../requirements/requirements-functional.md) · [mod-split §3.9](../docs/module-split.md) · [原型 #template-modal line 1991](../proto/workspace.html) |
| 4.4b | `useTemplateVars` — 检测/填充/替换变量 | `features/template/hooks/useTemplateVars.ts` | [FRS 模板 F-130~132](../requirements/requirements-functional.md) · [mod-split §3.9](../docs/module-split.md) |
| 4.4c | WorkspacePage 集成：「模板变量」按钮 + 表单 panel | 修改 `WorkspacePage.tsx` | [mod-split §1 整体结构](../docs/module-split.md) |

### 4.2 关键接口

```typescript
// detectVariables 已实现 (src/features/editor/utils.ts)
import { detectVariables } from "@/features/editor/utils";
// 返回 string[]，如 ["姓名", "日期", "金额"]

// useTemplateVars Hook
function useTemplateVars(): {
  variables: string[];
  values: Record<string, string>;
  setValue(name: string, value: string): void;
  applyAll(): Promise<void>;      // 批量替换所有 {变量名} → 用户输入值
  hasVariables: boolean;
};
```

### 4.3 不修改的文件

- `src-tauri/` — 纯前端
- `src/stores/` — 只读
- `src/features/agent/` — 不碰

---

## 5. wt/phase4-polish — 细节打磨

**工作目录**: `worktree/phase4-polish`
**类型**: 全栈（前端为主 + 少量 Rust 配置）
**依赖**: Phase 1-3 全部完成

### 5.1 任务清单

| # | 任务 | 产出 | 参考文档 |
|---|------|------|----------|
| 4.5a | `FindReplaceDialog` + `useFindReplace` | `features/find-replace/` | [FRS 文本编辑 F-026](../requirements/requirements-functional.md) · [mod-split §3.11](../docs/module-split.md) · [原型 #find-replace-modal line 1818](../proto/workspace.html) |
| 4.5b | 暗色模式：Tailwind `dark:` 类补全 + 标题栏切换按钮 | 全局 CSS + `WorkspacePage.tsx` | [FRS UX F-060](../requirements/requirements-functional.md) · [原型 #btn-dark-mode line 1424](../proto/workspace.html) |
| 4.5c | 全局快捷键：Ctrl+F / Ctrl+P / Ctrl+H 等 | `hooks/useKeyboard.ts` 增强 | [FRS UX F-062](../requirements/requirements-functional.md) |
| 4.5d | `useAutoSave` — 定时保存 + 崩溃恢复草稿 | `features/document/hooks/useAutoSave.ts` | [FRS 文档管理 F-016](../requirements/requirements-functional.md) |
| 4.5e | 自动更新：`tauri-plugin-updater` 集成 | `src-tauri/` + 前端 UI | [FRS Tauri F-144](../requirements/requirements-functional.md) |
| 4.5f | 文件关联 + 系统菜单（Tauri bundle 配置） | `tauri.conf.json` | [FRS Tauri F-140~141](../requirements/requirements-functional.md) |
| 4.5g | 打印支持：`window.print()` + CSS `@media print` | `index.css` + `WorkspacePage.tsx` | [FRS Tauri F-145](../requirements/requirements-functional.md) |
| 4.5h | 多语言补全：所有 i18n key 填充 | `en.ts` / `zh-CN.ts` | [FRS UX F-061](../requirements/requirements-functional.md) · [i18n-standards](../docs/i18n-standards.md) |
| 4.5i | 数据管理入口：清除历史/草稿/设置 | `SettingsDrawer` 增加 section | [data-persistence.md](../docs/data-persistence.md) |
| 4.5j | 粘贴格式降级提示 | `useEditorBridge` 增强 | [error-states.md](../docs/error-states.md) |

### 5.2 最简范围建议

**第一批（必须）**:

| 任务 | 原因 |
|------|------|
| FindReplaceDialog + useFindReplace | F-026 Should，编辑器必备 |
| 暗色模式补全 + 标题栏切换按钮 | F-060 Should，用户期待，原型有设计 |
| 全局快捷键补全 | F-062 Should |
| useAutoSave | F-016 Must |

**第二批（可延后）**:

| 任务 | 原因 |
|------|------|
| 自动更新 | 依赖 `tauri-plugin-updater`，Nightly 前非必须 |
| 文件关联 | Tauri bundle 配置，发布前完成 |
| 打印 | 与编辑器内容渲染相关 |
| 多语言补全 | 渐进式补充 |
| 数据管理 | 设置面板增加 section |

### 5.3 不修改的文件

- `src-tauri/src/pi/` — 不碰
- `src/features/agent/hooks/` — 只读

---

## 6. 共享接口对齐

所有分支共同消费的接口（Phase 1-3 已实现）：

| 接口 | Import 路径 | 分支 |
|------|-----------|------|
| `EditorBridge` | `@/stores/useDocumentStore` | 全部 |
| `useDocumentStore` | `@/stores/useDocumentStore` | 全部 |
| `useAppStore` | `@/stores/useAppStore` | 全部（modal 管理） |
| `useT` / i18n | `@/lib/i18n` | 全部 |
| `detectVariables` | `@/features/editor/utils` | template |
| `useAgentCommands` | `@/features/agent/hooks/useAgentCommands` | review（可选） |

---

## 7. 合并流程

```
Step 1: 合并 wt/phase4-table-refs → master
Step 2: 合并 wt/phase4-page-layout → master
Step 3: 合并 wt/phase4-review → master
Step 4: 合并 wt/phase4-template → master
Step 5: 合并 wt/phase4-polish → master（最后合并，可能需解决 WorkspacePage 冲突）
```

```bash
# 清理
git worktree remove worktree/phase4-table-refs --force
git worktree remove worktree/phase4-page-layout --force
git worktree remove worktree/phase4-review --force
git worktree remove worktree/phase4-template --force
git worktree remove worktree/phase4-polish --force
git branch -d wt/phase4-table-refs wt/phase4-page-layout wt/phase4-review wt/phase4-template wt/phase4-polish
```
