# features/references — 引用元素

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-110~113
> **状态**：草案

---

## 1. 模块结构

```
features/references/
├── components/
│   ├── HyperlinkDialog.tsx       # 超链接插入/编辑对话框
│   └── FootnoteDialog.tsx        # 脚注/尾注插入对话框
└── hooks/
    ├── useHyperlink.ts          # 超链接操作
    └── useFootnote.ts           # 脚注/尾注操作
```

---

## 2. 组件契约

### HyperlinkDialog

```typescript
interface HyperlinkDialogProps {
  open: boolean;
  onClose: () => void;

  // 编辑模式时传入
  existingUrl?: string;
  existingText?: string;

  onInsert: (url: string, text: string) => void;
  onUpdate: (url: string, text: string) => void;
  onRemove: () => void;
}

// 包含字段：URL输入 + 显示文本输入
// 如果选中了文本，显示文本默认填入选中内容
```

### FootnoteDialog

```typescript
interface FootnoteDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (type: "footnote" | "endnote", text: string) => void;
}

// 类型选择：脚注（页面底部）/ 尾注（文档末尾）
// 注释内容输入
```

---

## 3. Hook 契约

### useHyperlink

```typescript
interface UseHyperlinkReturn {
  isInHyperlink: boolean;
  currentUrl: string | null;
  insertHyperlink(url: string, text: string): void;
  editHyperlink(url: string): void;
  removeHyperlink(): void;
}

function useHyperlink(): UseHyperlinkReturn;
```

### useFootnote

```typescript
interface UseFootnoteReturn {
  insertFootnote(text: string): void;
  insertEndnote(text: string): void;
}

function useFootnote(): UseFootnoteReturn;
```

---

## 4. 状态依赖

| Store | 读取 |
|-------|------|
| `useDocumentStore` | `editorBridge` |

---

## 5. Tauri 依赖

无。

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `ref.hyperlink` | 超链接 | Hyperlink |
| `ref.url` | 网址 | URL |
| `ref.displayText` | 显示文本 | Display Text |
| `ref.insertLink` | 插入链接 | Insert Link |
| `ref.editLink` | 编辑链接 | Edit Link |
| `ref.removeLink` | 移除链接 | Remove Link |
| `ref.footnote` | 脚注 | Footnote |
| `ref.endnote` | 尾注 | Endnote |
| `ref.footnoteText` | 注释内容 | Note Text |
| `ref.insertFootnote` | 插入脚注 | Insert Footnote |
| `ref.bookmark` | 书签 | Bookmark |
