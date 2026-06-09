# features/editor — 编辑器核心

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-020~028（文本编辑）、F-063~067（UX）
> **依赖**：`@eigenpal/docx-editor-react`（DocxEditor 组件）
> **状态**：草案

---

## 1. 模块结构

```
features/editor/
├── components/
│   ├── EditorPane.tsx            # DocxEditor 容器
│   ├── OutlinePanel.tsx          # 左侧大纲面板
│   ├── Ruler.tsx                 # 水平/垂直标尺
│   └── StatusBar.tsx             # 底部状态栏
└── hooks/
    └── useEditorBridge.ts        # DocxEditor ref 封装 + 事件桥接
```

---

## 2. 组件契约

### EditorPane

```typescript
// EditorPane 是 DocxEditor 的容器，负责：
// 1. 集成 @eigenpal/docx-editor-react 的 <DocxEditor>
// 2. 传入 document + buffer 数据
// 3. 通过 ref 暴露 EditorHandle 给 useEditorBridge
// 4. 管理 zoom 缩放

// 渲染：
<DocxEditor
  ref={editorRef}
  document={document}
  documentBuffer={buffer}
  zoom={zoom}
  showRuler={false}       // 标尺由外部 Ruler 组件处理
  toolbarExtra={null}     // 工具栏由外部 Toolbar 组件处理
  onSelectionChange={handleSelectionChange}
  onDocumentChange={handleDocumentChange}
/>
```

### OutlinePanel

```typescript
interface OutlinePanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

// 内部从 useEditorBridge 获取 outline 数据
// 点击标题 → editorBridge.scrollToParaId(paraId)
```

### Ruler

```typescript
// 无 props
// 内部从 useDocumentStore 获取 zoom，绘制刻度
// 32 个 tick = 1 英寸水平标尺
```

### StatusBar

```typescript
// 无 props
// 读取 useDocumentStore: currentPage, totalPages, wordCount
// 读取 useDocumentStore: isDirty → 显示保存状态
// 包含 ZoomControl（来自 features/page-layout）
```

---

## 3. Hook 契约 — useEditorBridge

这是**核心桥梁 hook**，所有其他 feature 通过它操作编辑器。

```typescript
interface EditorBridge {
  // --- 查询 ---
  getAgent(): DocumentAgent | null;         // docx-editor 的编程式操作接口
  getDocument(): Document | null;           // 当前 Document 对象
  getSelectionInfo(): SelectionInfo | null;  // 扁平化选区信息
  getAgentContext(): AgentContext;          // 文档上下文（字数/大纲/样式…）
  getText(): string;                        // 纯文本
  getFormattedText(): FormattedTextSegment[];

  // --- 编辑操作 ---
  insertText(text: string): void;
  replaceSelection(text: string): void;
  applyFormatting(formatting: Partial<TextFormatting>): void;
  applyStyle(styleId: string): void;

  // --- 结构化操作 ---
  insertTable(rows: number, cols: number): void;
  insertImage(src: string): void;
  insertHyperlink(url: string, text: string): void;

  // --- 导航 ---
  scrollToParaId(paraId: string): void;
  focus(): void;

  // --- 审阅 ---
  addComment(text: string): number | null;
  proposeChange(change: TrackedChangeInfo): boolean;

  // --- 查找 ---
  findInDocument(query: string): FindResult[];

  // --- 输出 ---
  save(): Promise<ArrayBuffer | null>;

  // --- 状态 ---
  isReady: boolean;     // DocxEditor 是否已挂载完毕
}

function useEditorBridge(): EditorBridge;
```

实现方式：
- 通过 `useRef<DocxEditorRef>` 持有编辑器引用
- 在 `EditorPane` 的 `onMount` 回调中写入 `useDocumentStore.setEditorBridge(bridge)`
- 其他 feature 通过 `const bridge = useDocumentStore(s => s.editorBridge)` 获取

---

## 4. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useDocumentStore` | `setEditorBridge()`, `setSelection()`, `setCurrentPage()` | `document`, `buffer`, `zoom`, `editorBridge` |
| `useSettingsStore` | 无 | `editorConfig.spellcheck` |

---

## 5. Tauri 依赖

无。编辑器渲染完全在前端（DOM 渲染 + ProseMirror）。文件 I/O 由 `features/document` 负责。

---

## 6. 关键设计决策

| 决策 | 说明 |
|------|------|
| 标尺外置 | `DocxEditor` 内置标尺关闭(`showRuler={false}`)，由独立 `Ruler` 组件绘制，保证与大纲/Agent面板宽度自适应 |
| Bridge 存入 store | 避免深层 prop drilling，所有 feature 都能直接通过 store 获取编辑能力 |
| 不直接从 store 读写 document | `document` 对象只能通过 `useDocument.hooks` 修改，保证变更追踪一致 |

---

## 7. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `editor.outline` | 大纲 | Outline |
| `editor.noHeadings` | 暂无标题 | No headings yet |
| `editor.page` | 第 {current} 页 | Page {current} |
| `editor.totalPages` | 共 {total} 页 | of {total} |
| `editor.words` | {count} 字 | {count} words |
| `editor.zoom` | 缩放 | Zoom |
| `editor.cursorLine` | 行 {line} | Line {line} |
| `editor.cursorCol` | 列 {col} | Col {col} |
