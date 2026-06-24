# Ribbon 功能区 + 三栏布局后续优化规划

> **前置条件:** 本规划基于 `feat/ribbon-layout` 分支的已实现骨架(6 标签页 Ribbon + 可调宽三栏 + 折叠浮窗)。
> 接口能力调研基于 `@eigenpal/docx-editor-core` 和 `@eigenpal/docx-editor-react` 的类型定义。

## 一、现状分析

### 已实现(骨架)

| 模块 | 状态 |
|------|------|
| Ribbon 容器 + 6 标签页(开始/插入/布局/引用/审阅/视图) | ✅ 标签切换、ARIA tablist |
| Ribbon 共享子组件(Group/Button/ToggleButton/Separator) | ✅ |
| useResizablePanel + PanelResizeHandle + PanelPopover | ✅ 拖拽调宽 + 折叠浮窗 |
| useAppStore persist(布局态持久化) | ✅ |
| 旧 Toolbar 删除 | ✅ |

### 关键缺口

| 缺口 | 影响 | 来源 |
|------|------|------|
| **EditorBridge.applyFormatting 未转发 `() => false`** | 字体/字号/颜色等格式操作失效;且此 API 是 agent 导向(需 paraId 定位),Ribbon 场景应走 ProseMirror 命令而非直接转发 | `useEditorBridge.ts:39` |
| **EditorBridge.setParagraphStyle 未转发 `() => false`** | 段落样式应用失效;同理为 agent 导向 API | `useEditorBridge.ts:40` |
| **execInsertTable 占位写入提示文本** | 点击插入表格会在文档写入 `\n[表格 3×3 — 即将实现]\n`,需先回退此副作用 | `commands.ts:151-159` |
| **字体/字号 Select 非受控** | 不回显当前选区字体/字号 | HomeTab.tsx |
| **颜色选择器是裸 input[type=color]** | 无预设色板,体验差 | HomeTab.tsx |
| **全部用 emoji/Unicode 图标** | 跨平台不一致,无专业感 | 全部 Tab |
| **标尺按钮 onClick 空** | 标尺切换不工作 | ViewTab.tsx |
| **无快捷键绑定** | Cmd+B 等只在编辑器内部,Ribbon 按钮无 | — |
| **无命令面板注册** | 新增 Ribbon 操作无法 Cmd+K 触达 | — |

## 二、docx-editor 接口能力清单

### DocxEditorRef 暴露的方法(30+)

| 方法 | 签名 | 当前 bridge 是否接入 |
|------|------|---------------------|
| `save(options?)` | `→ Promise<ArrayBuffer \| null>` | ✅ |
| `focus()` | `→ void` | ✅ |
| `setZoom(zoom)` | 分数刻度(0-1) | ✅ (百分比↔分数转换) |
| `getZoom()` | `→ number` | ❌ |
| `getCurrentPage()` | `→ number` | ❌ (靠 500ms 轮询) |
| `getTotalPages()` | `→ number` | ❌ (靠 500ms 轮询) |
| `scrollToPage(n)` | `→ void` | ❌ |
| `scrollToParaId(paraId)` | `→ boolean` | ✅ |
| `scrollToPosition(pmPos)` | `→ void` | ❌ |
| `openPrintPreview()` | `→ void` | ❌ |
| `print()` | `→ void` | ❌ |
| `loadDocument(doc)` | `→ void` | ❌ |
| `loadDocumentBuffer(buf)` | `→ Promise<void>` | ❌ |
| `applyFormatting(opts)` | `→ boolean` | ❌ **存根** |
| `setParagraphStyle(opts)` | `→ boolean` | ❌ **存根** |
| `addComment(opts)` | `→ number \| null` | ❌ |
| `replyToComment(id, text, author)` | `→ number \| null` | ❌ |
| `resolveComment(id)` | `→ void` | ❌ |
| `proposeChange(opts)` | `→ boolean` | ❌ |
| `findInDocument(query, opts?)` | `→ Array<Match>` | ❌ |
| `getPageContent(n)` | `→ PageContent \| null` | ❌ |
| `getSelectionInfo()` | `→ SelectionInfo \| null` | ❌ (用 store 缓存) |
| `getComments()` | `→ Comment[]` | ❌ |
| `getContentControls(filter?)` | `→ PMContentControl[]` | ❌ |
| `scrollToContentControl(filter)` | `→ boolean` | ❌ |
| `setContentControlContent(...)` | `→ boolean` | ❌ |
| `removeContentControl(...)` | `→ boolean` | ❌ |
| `setContentControlValue(...)` | `→ boolean` | ❌ |

### applyFormatting 参数结构

```typescript
interface ApplyFormattingOptions {
  paraId: string;       // 目标段落
  search?: string;      // 段落内定位特定文字
  marks: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean | { style?: string };
    strike?: boolean;
    color?: { rgb?: string; themeColor?: string };
    highlight?: string;          // 颜色名 ('yellow','cyan' 等)
    fontSize?: number;           // half-points (pt × 2)
    fontFamily?: { ascii?: string; hAnsi?: string };
  };
}
```

### docx-editor-core 命令清单

| 分类 | 命令数 | 代表命令 |
|------|--------|---------|
| 文本格式 | 23 | toggleBold/toggleItalic/setFontSize/setFontFamily/setTextColor/toggleStrikethrough/toggleSuperscript/toggleSubscript |
| 段落格式 | 41 | setAlignment/setLineSpacing/toggleBulletList/toggleNumberedList/applyStyle/setIndentation/setParagraphSpacing |
| 表格 | 27 | insertTable/mergeCells/splitCell/setCellBorder/setTableBorders/setCellFillColor/applyTableStyle/setCellVerticalAlign/toggleHeaderRow |
| 图片 | 2 | insertImageNode/setImageWrapType |
| 修订 | 8 | acceptChange/rejectChange/acceptAllChanges/rejectAllChanges/findNextChange/findPreviousChange |
| 批注 | 2 | addCommentMark/removeCommentMark |
| 水印 | 2 | getWatermarkFromState/setWatermark |
| 查找 | 3 | findInDocument/getSelectionInfo/getPageContent |

> **数据来源:** 命令计数通过遍历 `node_modules/@eigenpal/docx-editor-core/dist/` 下的 `.d.ts` 类型定义文件统计(prosemirror/commands/formatting.d.ts、paragraph.d.ts、table-P8esKWAc.d.ts、commands/index.d.ts)。库版本以 package.json 为准,升级后需重新核验。

### ProseMirror Schema

**Marks:** bold, italic, underline, strike, superscript, subscript, fontFamily, fontSize, color, highlight, link/hyperlink, comment, insertion, deletion

**Nodes:** paragraph, heading, code_block, ordered_list, bullet_list, list_item, table, table_row, table_cell, image, pageBreak, text

### 高级接口

- `TableSelectionManager` — 表格选区管理
- `LayoutCoordinator` — 布局协调(列宽调整/图片交互/选区追踪)
- `ErrorManager` — 错误/警告/信息提示
- `ClipboardManager` — 剪贴板(格式提取/选区 runs)
- `PluginLifecycleManager` — 插件生命周期
- React hooks: `useTableSelection`/`useSelectionHighlight`/`useClipboard`/`useAutoSave`/`useFindReplace`

## 三、Word 功能 → docx-editor 支持度映射

### 开始标签页

| Word 功能 | docx-editor 支持 | 当前 Ribbon | 优先级 |
|-----------|-----------------|-------------|--------|
| 撤销/重做 | ✅ undo()/redo() | ✅ | — |
| 加粗/斜体/下划线/删除线 | ✅ toggle 命令 | ✅ | — |
| 上标/下标 | ✅ toggle 命令 | ✅ | — |
| 字体选择 | ✅ fontFamily mark | ⚠️ 非受控 | P0 |
| 字号选择 | ✅ fontSize mark | ⚠️ 非受控 | P0 |
| 文字颜色 | ✅ color mark | ⚠️ 裸 input | P0 |
| 文本高亮 | ✅ highlight mark | ⚠️ 裸 input | P0 |
| 格式刷 | ⚠️ 需手动实现(复制 marks) | ❌ | P1 |
| 清除格式 | ✅ removeMark | ✅ | — |
| 标题/正文样式 | ✅ setParagraphStyle | ✅ | — |
| 对齐方式 | ✅ setAlignment | ✅ | — |
| 有序/无序列表 | ✅ toggle 命令 | ✅ | — |
| 缩进/减少缩进 | ✅ 命令 | ✅ | — |
| 查找替换入口 | ✅ findInDocument | ❌ | P1 |

### 插入标签页

| Word 功能 | docx-editor 支持 | 当前 Ribbon | 优先级 |
|-----------|-----------------|-------------|--------|
| 插入表格 | ✅ insertTable(rows,cols) | ⚠️ 占位 | P0 |
| 插入图片 | ✅ insertImageNode | ✅ | — |
| 插入超链接 | ✅ hyperlink mark | ✅ | — |
| 插入脚注 | ✅ FootnoteDialog | ✅ | — |
| 分页符 | ✅ pageBreak node | ✅ | — |
| 插入日期 | ⚠️ 需手动实现 | ❌ | P2 |
| 插入符号 | ⚠️ 需手动实现 | ❌ | P2 |

### 布局标签页

| Word 功能 | docx-editor 支持 | 当前 Ribbon | 优先级 |
|-----------|-----------------|-------------|--------|
| 页面设置 | ✅ PageSetupDialog | ✅ | — |
| 页眉页脚 | ✅ HeaderFooterEditor | ✅ | — |
| 行距 | ✅ setLineSpacing | ❌ | P1 |
| 段前/段后间距 | ✅ setParagraphSpacing | ❌ | P1 |
| 左/右缩进 | ✅ setIndentation | ❌ | P1 |
| 首行缩进 | ✅ setIndentation | ❌ | P1 |
| 页边距快捷 | ✅ SectionProperties | ❌ | P2 |
| 纸张方向 | ✅ SectionProperties | ❌ | P2 |

### 引用标签页

| Word 功能 | docx-editor 支持 | 当前 Ribbon | 优先级 |
|-----------|-----------------|-------------|--------|
| 插入脚注 | ✅ | ✅ | — |
| 目录 | ⚠️ 需从 headings 生成 | ❌ disabled | P2 |
| 插入引文 | ❌ 不支持 | — | — |
| 插入题注 | ❌ 不支持 | — | — |

### 审阅标签页

| Word 功能 | docx-editor 支持 | 当前 Ribbon | 优先级 |
|-----------|-----------------|-------------|--------|
| 新建批注 | ✅ addComment | ✅ | — |
| 查看批注 | ✅ getComments | ✅ CommentPanel | — |
| 字符统计 | ✅ charCount | ✅ | — |
| 修订模式 | ✅ insertion/deletion marks | ❌ | P1 |
| 接受/拒绝修订 | ✅ acceptChange/rejectChange | ❌ | P1 |
| 拼写检查 | ❌ 不支持 | — | — |
| 比较/合并文档 | ❌ 不支持 | — | — |

### 视图标签页

| Word 功能 | docx-editor 支持 | 当前 Ribbon | 优先级 |
|-----------|-----------------|-------------|--------|
| 大纲切换 | ✅ toggleOutlinePanel | ✅ | — |
| 标尺切换 | ⚠️ 需接入 | ⚠️ onClick 空 | P1 |
| 缩放 | ✅ setZoom | ✅ | — |
| 缩放百分比显示 | ✅ getZoom | ❌ | P1 |
| Agent 侧栏 | ✅ toggleAgentSidebar | ✅ | — |
| 打印预览 | ✅ openPrintPreview | ❌ | P1 |
| 打印 | ✅ print() | ❌ | P1 |
| 导航窗格 | ⚠️ 复用 OutlinePanel | ❌ | P2 |
| 网格线 | ❌ 不支持 | — | — |

## 四、分阶段实施计划

### 并行实施策略

基于各 Phase 的文件依赖关系,分四波执行以最大化并行度:

```
Wave 1 (串行,阻塞)
  └─ Phase 0: commands.ts + format-apply.ts + useEditorBridge.ts
       ↑ 所有格式命令的底层依赖,必须先完成

Wave 2 (三路并行,文件不重叠)
  ├─ Phase 1: Ribbon 子组件 + 6 Tab + command-palette + WorkspacePage (图标/视觉/快捷键)
  ├─ Phase 6: PanelResizeHandle + PanelPopover (拖拽/浮窗打磨,纯组件内部行为)
  └─ Phase 7: ErrorBoundary + store selector (性能/a11y,贯穿性独立工作)
       ↑ Phase 1 改 Ribbon/*.tsx,Phase 6 改 layout/*.tsx,Phase 7 新建 ErrorBoundary — 文件不冲突
       ⚠️ WorkspacePage.tsx 仅 Phase 1 改(快捷键/命令面板) — Phase 6 已收敛为纯组件内部改动,不碰 WorkspacePage,无并行冲突

Wave 3 (四路并行,各改不同 Tab 文件)
  ├─ Phase 2: HomeTab + use-format-state.ts + ColorPicker/FormatPainter (开始标签页功能)
  ├─ Phase 3: LayoutTab + commands.ts 段落命令 (布局标签页功能)
  ├─ Phase 4: 新建 TableToolsTab/PictureFormatTab + 改 Ribbon.tsx (上下文标签页)
  └─ Phase 5: ReviewTab + ViewTab + commands.ts 修订/打印命令 (审阅/视图)
       ↑ 前提:Wave 2 已完成图标替换,各 Phase 改不同 Tab 文件(HomeTab/LayoutTab/新建/ReviewTab+ViewTab)
       ⚠️ Phase 3 和 Phase 5 都追加 commands.ts 函数(段落格式 vs 修订/打印),函数名无冲突,只需注意 git add 粒度
       ⚠️ Phase 4 改 Ribbon.tsx 动态标签页逻辑,其他 Phase 不改 Ribbon.tsx — 无冲突
```

**并行约束:**
- 同一文件的并发编辑(git index 竞争)通过"各自只 git add 自己的文件"约定解决,必要时用 `git reset HEAD -- .` 清 index
- commands.ts 被 Phase 3/5 共享:各 Phase 追加不同 exec* 函数(Phase 3 加段落命令、Phase 5 加修订/打印命令),函数名无冲突
- WorkspacePage.tsx 被 Phase 1 和 Phase 6 共享:建议同一 Wave 内由同一 subagent 统一改 WorkspacePage
- Wave 3 四路并行的前提是 Wave 2 已完成:各 Tab 文件的图标替换已落地,Phase 2-5 在此基础上改功能内容

**建议执行顺序:**
1. Wave 1 单独执行(Phase 0,约 1-2 小时)
2. Wave 2 三路并行(Phase 1 + 6 + 7,约 3-4 小时)
3. Wave 3 四路并行(Phase 2 + 3 + 4 + 5,约 4-6 小时)

总工期:串行约 15 小时,并行优化后约 8-9 小时

### Phase 0:补全格式命令接线(阻塞性,必须先做)

> **架构决策(审查修正):** `DocxEditorRef.applyFormatting` 是 agent 导向 API,签名 `(opts: { paraId: string; search?: string; marks: {...} })`——需要 paraId 定位段落,是给 LLM 用的。Ribbon 按钮操作的是当前 ProseMirror 选区,没有 paraId。直接转发 `bridge.applyFormatting = ref.applyFormatting` 在 Ribbon 场景不工作。
>
> **正确路径:** docx-editor-core 已暴露 23 个文本格式命令和 41 个段落命令(ProseMirror Command 函数),这些命令直接操作当前选区,与 Ribbon 模型匹配。现有 `commands.ts` 的 `execToggleMark`/`execSetBlockType` 已走此路径(用 `toggleMark`/`setBlockType`)。Phase 0 需用同样的方式接入字体/字号/颜色/高亮等命令,而非转发 applyFormatting。

**Files:**
- Modify: `src/features/formatting/format-apply.ts` — 重写 applyFont/applyFontSize/applyTextColor/applyHighlight,从手动 `view.state.tr.addMark` 改为调用 docx-editor-core 的 PM 命令
- Modify: `src/features/editor/commands.ts:151-159` — execInsertTable 回退提示文本,改用真实 insertTable 命令
- Modify: `src/features/editor/hooks/useEditorBridge.ts:39-40` — applyFormatting/setParagraphStyle 转发给 ref(agent 场景仍需要,但 Ribbon 不依赖)

**Tasks:**

- [ ] **0.1 commands.ts 新增格式命令封装** — 与 `execToggleMark` 同构,新增 `execSetFontFamily(ascii: string)` / `execSetFontSize(halfPt: number)` / `execSetTextColor(rgb: string)` / `execSetHighlight(color: string)`,内部调用 docx-editor-core 的 `setFontFamily` / `setFontSize` / `setTextColor` / `setHighlight` PM 命令(来自 `@eigenpal/docx-editor-core/prosemirror/commands/formatting`)。然后 `format-apply.ts` 的 applyFont/applyFontSize/applyTextColor/applyHighlight 改为调用这些 exec* 函数(而非手动 `view.state.tr.addMark`)。bold/italic/underline/strike 已通过 execToggleMark 工作,无需改动
- [ ] **0.2 execInsertTable 回退 + 实现** — 删除 `view.state.tr.insertText("\n[表格...]\n")` 副作用;改为 `apply(insertTable(rows, cols))`(insertTable 来自 `@eigenpal/docx-editor-core/table`)
- [ ] **0.3 bridge applyFormatting/setParagraphStyle 转发(可选,低优先)** — 从 `() => false` 改为 `ref.applyFormatting(opts)` / `ref.setParagraphStyle(opts)`。仅供 agent/命令面板场景用,Ribbon 不依赖此路径,可推迟到有 agent 集成需求时再做
- [ ] **0.4 验证** — 手动测试:选中文字 → 加粗/斜体/改字体/改字号/改颜色/加高亮 → 确认选区格式变化;插入表格 → 确认真实表格出现而非提示文本
- [ ] **0.5 扩展 EditorBridge 类型(联动改动)** — 补充 getZoom/getCurrentPage/getTotalPages/scrollToPage/openPrintPreview/print/addComment/findInDocument 等方法。**注意:** 当前 `EditorBridge` 类型(`useDocumentStore.ts:11-25`)只定义了 11 个方法,factory (`createEditorBridge`) 也只返回这 11 个。Task 0.5 实际包含三步联动:(a) 扩展 `EditorBridge` 类型定义 (b) 在 `createEditorBridge` 中补转发 (c) 消费方按需调用。建议分批:先补 Phase 5 要用的(print/printPreview/zoom),其余随用随补

### Phase 1:图标系统 + 视觉基线 + 命令面板 + 快捷键

**目标:** 从"能用"到"好看",建立专业视觉基线。

**Files:**
- Create: `src/features/ribbon/components/RibbonTooltip.tsx`
- Modify: 全部 Ribbon 子组件 + 6 Tab 文件
- Modify: `src/features/agent/components/command-palette.tsx` (注册 Ribbon 操作)

**Tasks:**

- [ ] **1.1 引入 lucide-react** — `bun add lucide-react`,所有按钮换 SVG 图标(Bold/Italic/Underline/Strikethrough/AlignLeft/AlignCenter/AlignRight/List/ListOrdered/Indent/Outdent/Undo/Redo/Table/Image/Link/Footnote/PageBreak/Type/Pilcrow/MessageSquare/BarChart3/PanelLeft/ZoomIn/ZoomOut/Bot 等)
- [ ] **1.2 按钮 hover/active 动效** — hover `scale-105 + bg-accent`,active `scale-95`,transition 150ms
- [ ] **1.3 标签页激活态** — 底部 2px 高亮线(primary 色),非激活 hover 灰色背景
- [ ] **1.4 组标题样式** — `text-[11px] uppercase tracking-wide text-muted-foreground`
- [ ] **1.5 RibbonTooltip** — 按钮 hover 显示 tooltip(含快捷键提示),用现有 `@/components/ui/tooltip`
- [ ] **1.6 响应式折叠** — 窗口宽度 < 768px 时 Ribbon 只显示标签名(隐藏面板),点击标签弹出浮层面板;用 `useMediaQuery` 或 CSS `@container`
- [ ] **1.7 命令面板注册** — 将 Ribbon 所有操作(加粗/斜体/对齐/插入表格等)注册到 CommandPalette,通过 `openModal("commandPalette")` 可搜索触发
- [ ] **1.8 快捷键绑定** — 在 WorkspacePage 全局 keydown 中绑定 Cmd+B/I/U(加粗/斜体/下划线)、Cmd+Shift+S(删除线)、Cmd+Shift+7/8(有序/无序列表)、Cmd+]/[(缩进/减少缩进),调用对应 exec* 命令。**注意:** docx-editor 内部可能已捕获 Cmd+B/I/U(编辑器内置快捷键)。实现前需确认:(a) 编辑器是否拦截这些事件 (b) 若已拦截,Ribbon 层快捷键改为补充编辑器未覆盖的(如格式刷 Cmd+Shift+C、清除格式 Cmd+\),避免重复绑定导致幽灵 bug。建议先用 `console.log` 在 WorkspacePage keydown 中观察事件是否冒泡到 document 层

### Phase 2:开始标签页功能补全

**目标:** 字体/字号回显、颜色色板、格式刷。

**Files:**
- Modify: `src/features/ribbon/components/tabs/HomeTab.tsx`
- Modify: `src/features/formatting/hooks/use-format-state.ts`
- Create: `src/features/ribbon/components/ColorPicker.tsx`
- Create: `src/features/ribbon/components/FormatPainter.tsx`

**Tasks:**

- [ ] **2.1 useFormatState 扩展** — 读取当前选区的 fontFamily/fontSize/textColor/highlight 值(从 ProseMirror marks 提取),不只是 boolean isActive
- [ ] **2.2 字体 Select 受控** — value 绑定 useFormatState 的当前字体,onChange 调 applyFont
- [ ] **2.3 字号 Select 受控** — value 绑定当前字号(half-points → pt 显示),onChange 调 applyFontSize
- [ ] **2.4 ColorPicker 组件** — 预设 10 色色板(黑/白/红/橙/黄/绿/蓝/紫/粉/灰)+ "更多颜色"按钮(展开原生 color input),替代裸 input
- [ ] **2.5 文字颜色 ColorPicker** — 接入 textColor mark,显示当前颜色
- [ ] **2.6 高亮 ColorPicker** — 接入 highlight mark,显示当前高亮色
- [ ] **2.7 格式刷** — 点击复制选区 marks → 光标变格式刷图标 → 下次选区自动应用 → Esc 取消
- [ ] **2.8 查找替换入口** — 开始标签页编辑组加"查找"按钮,onClick 调 `openModal("findReplace")`

### Phase 3:布局标签页 + 段落格式

**目标:** 行距/段落间距/缩进控制。

**Files:**
- Modify: `src/features/ribbon/components/tabs/LayoutTab.tsx`
- Modify: `src/features/editor/commands.ts` (新增段落格式命令)

**Tasks:**

- [ ] **3.1 execSetLineSpacing** — 封装 `setLineSpacing` 命令,参数 line spacing 值(1.0/1.15/1.5/2.0)
- [ ] **3.2 行距 dropdown** — LayoutTab 缩进组旁新增行距 Select
- [ ] **3.3 execSetParagraphSpacing** — 封装 `setParagraphSpacing` 命令,参数 before/after(pt)
- [ ] **3.4 段落间距按钮** — 段前/段后数值输入或 dropdown
- [ ] **3.5 左/右缩进** — 封装 `setIndentation` 命令,LayoutTab 缩进组加左缩进/右缩进按钮
- [ ] **3.6 首行缩进** — setIndentation 支持首行缩进参数

### Phase 4:上下文标签页(Contextual Tabs)

**目标:** 选中表格/图片时出现专属标签页。

**Files:**
- Create: `src/features/ribbon/components/tabs/TableToolsTab.tsx`
- Create: `src/features/ribbon/components/tabs/PictureFormatTab.tsx`
- Modify: `src/features/ribbon/components/Ribbon.tsx` (动态标签页)
- Modify: `src/stores/useAppStore.ts` (selectionContext 状态)

**Tasks:**

- [ ] **4.1 选区上下文检测** — useFormatState 扩展 `getSelectionContext()`,返回当前选区是否在表格/图片内
- [ ] **4.2 TableToolsTab** — 边框/底纹/合并/拆分/对齐/行高/列宽/表头切换/表格样式
- [ ] **4.3 PictureFormatTab** — 环绕类型(square/tight/topAndBottom/behind/inFront/inline)/裁剪/大小/边框
- [ ] **4.4 Ribbon 动态标签页** — 选区上下文变化时自动插入/移除上下文标签页(高亮色区分)
- [ ] **4.5 表格命令封装** — 封装 27 个表格命令为 exec* 函数(mergeCells/splitCell/setCellBorder 等)

### Phase 5:审阅 + 视图功能补全

**目标:** 修订模式、打印、标尺切换。

**Files:**
- Modify: `src/features/ribbon/components/tabs/ReviewTab.tsx`
- Modify: `src/features/ribbon/components/tabs/ViewTab.tsx`
- Modify: `src/features/editor/commands.ts`

**Tasks:**

- [ ] **5.1 修订模式 toggle** — 封装 insertion/deletion marks 的开关,ReviewTab 加修订模式按钮
- [ ] **5.2 接受/拒绝修订** — acceptChange/rejectChange 按钮,findNextChange/findPreviousChange 导航
- [ ] **5.3 全部接受/拒绝** — acceptAllChanges/rejectAllChanges
- [ ] **5.4 标尺切换** — ViewTab 标尺按钮接入真实逻辑(Ruler 组件 visible 状态,存 useAppStore)
- [ ] **5.5 缩放百分比显示** — ViewTab 缩放组显示当前 zoom 值(如 "100%"),用 getZoom 或 store 的 zoom
- [ ] **5.6 打印预览** — ViewTab 加打印预览按钮,调 `ref.openPrintPreview()`
- [ ] **5.7 打印** — ViewTab 加打印按钮,调 `ref.print()`

### Phase 6:三栏布局交互打磨

**目标:** 拖拽/折叠/浮窗体验提升。

**Files:**
- Modify: `src/features/layout/components/PanelResizeHandle.tsx` (6.1/6.2/6.3/6.5)
- Modify: `src/features/layout/components/PanelPopover.tsx` (6.4/6.6)

> **文件范围说明(审查修正):** 原 Plan 列出 `WorkspacePage.tsx`,但实际 6 个 Task 均为组件内部行为(样式/动画/键盘监听/双击),不涉及 WorkspacePage 布局 JSX 或 props 传递。移除此处以消除与 Phase 1 的并行冲突(Phase 1 改 WorkspacePage 快捷键/命令面板注册)。若实现中发现确需 WorkspacePage 配合,提到 Phase 1 worktree 统一处理。

**Tasks:**

- [ ] **6.1 拖拽 handle 视觉** — 默认 `w-px bg-border/50`,hover `w-1.5 bg-primary/60`,transition 150ms
- [ ] **6.2 拖拽宽度 tooltip** — 拖拽时在 handle 旁显示实时宽度(如 "280px")
- [ ] **6.3 双击恢复默认** — 双击 handle 恢复 outlineWidth=220 / agentWidth=380
- [ ] **6.4 浮窗动画** — PanelPopover 加 `transition-transform duration-200`,left 侧从 `-translate-x-full` 滑入,right 侧从 `translate-x-full` 滑入
- [ ] **6.5 折叠态竖条图标** — 用 lucide PanelLeftClose/PanelRightClose 图标替代旋转文字
- [ ] **6.6 浮窗 Escape 关闭** — PanelPopover 加 Escape 键监听关闭

### Phase 7:性能 + 错误边界 + a11y(贯穿)

**目标:** 确保稳定性与可达性。

**Tasks:**

- [ ] **7.1 store 订阅粒度优化** — 每个按钮只订阅自己需要的 store 字段(如 bold 按钮只订阅 `formatState.bold`),避免整个 formatState 变化导致全标签页重渲染。React Compiler 自动处理组件级 memo,但 store selector 粒度需手动优化
- [ ] **7.2 标签页懒加载** — 6 个标签页用 `React.lazy` + `Suspense`,只有激活时加载(减少首屏 bundle)
- [ ] **7.3 ErrorBoundary** — `src/features/ribbon/components/RibbonErrorBoundary.tsx`,包裹每个标签页,崩溃时显示 fallback UI + 错误报告
- [ ] **7.4 Tab 键焦点流转** — Tab 键从标签栏→当前标签页第一个按钮→组内按钮依次→下一个标签页
- [ ] **7.5 高对比度适配** — 确保所有按钮在 `forced-colors` 模式下可见
- [ ] **7.6 ARIA 完善补** — tabpanel 加 `aria-labelledby`,按钮加 `aria-pressed`(toggle)/`aria-disabled`

## 五、优先级总结

| Phase | 内容 | 投入 | 用户感知 | 建议时机 |
|-------|------|------|---------|---------|
| **0** | 补全 EditorBridge | 小 | 极高(修复核心功能) | **立即** |
| **1** | 图标+视觉+命令面板+快捷键 | 中 | 极高 | **立即** |
| **2** | 开始标签页功能补全 | 中 | 高 | Phase 0-1 后 |
| **3** | 布局+段落格式 | 中 | 中 | 下个迭代 |
| **4** | 上下文标签页 | 大 | 高 | 路线图 |
| **5** | 审阅+视图 | 大 | 中 | 路线图 |
| **6** | 布局交互打磨 | 小 | 中 | 随手做 |
| **7** | 性能+a11y | 小 | 低 | 贯穿 |

## 六、技术约束

- **React Compiler 已启用** — 禁止 useMemo/useCallback/memo,依赖编译器自动优化
- **性能优化方向** — store selector 粒度(每个按钮订阅最小字段集),而非手动 memo
- **包管理器** — Bun only
- **TDD** — 每个 Task 先写失败测试
- **i18n** — 所有新增 UI 文案双语(zh-CN + en)
- **commit** — 中英双语 message
