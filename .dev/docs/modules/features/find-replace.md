# features/find-replace — 查找替换

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-026
> **状态**：草案

---

## 1. 模块结构

```
features/find-replace/
├── components/
│   └── FindReplaceDialog.tsx     # 查找替换对话框
└── hooks/
    └── useFindReplace.ts        # 查找替换逻辑
```

---

## 2. 组件契约

### FindReplaceDialog

```typescript
interface FindReplaceDialogProps {
  open: boolean;
  onClose: () => void;
}
```

结构：
```
┌─────────────────────────────────┐
│ 查找和替换                      │
│ [________________] [▼ 选项]     │ ← 查找输入框
│ [________________]              │ ← 替换输入框
│                                │
│ 找到 3/12 处匹配                │ ← 查找统计
│                                │
│ [上一个] [下一个] [替换] [全部替换] │ ← 操作按钮
│                                │
│ □ 区分大小写  □ 全词匹配        │ ← 选项
└─────────────────────────────────┘
```

---

## 3. Hook 契约 — useFindReplace

```typescript
interface FindResult {
  index: number;
  start: number;
  end: number;
  text: string;
  paraId: string;
}

interface UseFindReplaceReturn {
  isOpen: boolean;
  results: FindResult[];
  currentIndex: number;
  totalMatches: number;

  find(query: string, options?: FindOptions): void;
  findNext(): void;
  findPrevious(): void;
  replaceCurrent(replacement: string): void;
  replaceAll(replacement: string): void;
  close(): void;
}

interface FindOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

function useFindReplace(): UseFindReplaceReturn;
```

---

## 4. 状态依赖

| Store | 读取 |
|-------|------|
| `useDocumentStore` | `editorBridge` |

内部通过 `bridge.findInDocument(query)` 实现。

---

## 5. Tauri 依赖

无。

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `find.title` | 查找和替换 | Find & Replace |
| `find.query` | 查找 | Find |
| `find.replaceWith` | 替换为 | Replace with |
| `find.matches` | {current}/{total} 处匹配 | {current} of {total} matches |
| `find.noMatches` | 未找到匹配项 | No matches found |
| `find.caseSensitive` | 区分大小写 | Case Sensitive |
| `find.wholeWord` | 全词匹配 | Whole Word |
| `find.previous` | 上一个 | Previous |
| `find.next` | 下一个 | Next |
| `find.replace` | 替换 | Replace |
| `find.replaceAll` | 全部替换 | Replace All |
