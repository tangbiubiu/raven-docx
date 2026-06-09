# features/formatting — 文本与段落格式

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-030~037（文本格式）、F-040~047（段落格式）、F-067（工具栏）
> **状态**：草案

---

## 1. 模块结构

```
features/formatting/
├── components/
│   ├── Toolbar.tsx               # 格式工具栏（主组件）
│   ├── FontPicker.tsx            # 字体下拉选择器
│   ├── FontSizePicker.tsx        # 字号下拉选择器
│   ├── ColorPicker.tsx           # 文字颜色 + 高亮颜色
│   └── ParagraphPanel.tsx        # 段落格式侧面板（缩进/行距/间距）
└── hooks/
    └── useFormatState.ts         # 根据选区同步按钮 active 状态
```

---

## 2. 组件契约

### Toolbar

```typescript
// 无 props，完全通过 store + bridge 驱动
// 结构：
// [undo] [redo] | [B] [I] [U] [S] | [heading▼] [font▼] [size▼] |
// [align L/C/R/J] | [ordered] [unordered] [indent] [outdent] |
// [color] [highlight] | [table] [image] [link] | [clear format]
```

Toolbar 不直接操作编辑器，而是调用 `useEditorBridge()` → `bridge.applyFormatting()`。

### FontPicker

```typescript
interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

// 字体列表从 @eigenpal/docx-editor-core 的 fontOptions 获取
// 支持中英文字体分别设置（eastAsia / ascii）
```

### FontSizePicker

```typescript
interface FontSizePickerProps {
  value: number;     // half-points (e.g. 15pt = 30)
  onChange: (size: number) => void;
}

// 预设：8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 28, 36, 48, 72pt
```

### ColorPicker

```typescript
interface ColorPickerProps {
  type: "text" | "highlight";
  value: string;            // hex color
  onChange: (color: string) => void;
}

// 调色板：主题色 10 行 × 标准色 + 自定义颜色拾取器
```

### ParagraphPanel

```typescript
// 无 props。从 useFormatState 获取当前段落格式
// 包含：对齐 / 缩进（左/右/首行/悬挂）/ 行距 / 段前段后 / 边框底纹
```

---

## 3. Hook 契约 — useFormatState

```typescript
interface FormatState {
  // 文本格式
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  highlight: string;
  isSuperscript: boolean;
  isSubscript: boolean;

  // 段落格式
  headingLevel: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  alignment: "left" | "center" | "right" | "justify";
  isOrderedList: boolean;
  isUnorderedList: boolean;
  indentLevel: number;
  lineSpacing: number;
  spaceBefore: number;
  spaceAfter: number;

  // 是否在表格中
  inTable: boolean;

  // 是否可以应用某些格式
  canUndo: boolean;
  canRedo: boolean;
}

function useFormatState(): FormatState;
```

实现方式：
- 监听 DocxEditor 的 `onSelectionChange` 事件
- 从 `bridge.getSelectionInfo()` 获取当前选区格式
- 将结果写入 `useDocumentStore.selectionFormat`
- Toolbar 各子按钮读取 `selectionFormat` 来设置 `active` 状态

---

## 4. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useDocumentStore` | `setSelectionFormat()`, `setCanUndoRedo()` | `selectionFormat`, `editorBridge` |

---

## 5. Tauri 依赖

无。纯前端格式操作，通过 `DocumentAgent.applyFormatting()` 完成。

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `format.bold` | 加粗 | Bold |
| `format.italic` | 斜体 | Italic |
| `format.underline` | 下划线 | Underline |
| `format.strike` | 删除线 | Strikethrough |
| `format.alignLeft` | 左对齐 | Align Left |
| `format.alignCenter` | 居中 | Align Center |
| `format.alignRight` | 右对齐 | Align Right |
| `format.alignJustify` | 两端对齐 | Justify |
| `format.orderedList` | 有序列表 | Ordered List |
| `format.unorderedList` | 无序列表 | Unordered List |
| `format.indent` | 增加缩进 | Increase Indent |
| `format.outdent` | 减少缩进 | Decrease Indent |
| `format.clearFormat` | 清除格式 | Clear Formatting |
| `format.heading` | 标题 | Heading |
| `format.paragraph` | 正文 | Paragraph |
| `format.font` | 字体 | Font |
| `format.fontSize` | 字号 | Font Size |
| `format.textColor` | 文字颜色 | Text Color |
| `format.highlight` | 高亮 | Highlight |
| `format.paragraphSettings` | 段落设置 | Paragraph Settings |
