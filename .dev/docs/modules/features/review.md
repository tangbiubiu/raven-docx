# features/review — 审阅与批注

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-120~122
> **状态**：草案

---

## 1. 模块结构

```
features/review/
├── components/
│   ├── CommentPanel.tsx          # 批注面板（侧栏 Tab 2）
│   └── CommentCard.tsx           # 单条批注卡片
└── hooks/
    └── useComments.ts           # 批注 CRUD + Agent 修订建议
```

---

## 2. 组件契约

### CommentPanel

```typescript
// 无 props，在 AgentSidebar 的 Tab "批注" 中渲染
// 列表渲染 CommentCard[]
// 支持：添加批注 / 回复 / 解决 / 删除
```

### CommentCard

```typescript
interface CommentCardProps {
  comment: CommentInfo;
  onReply: (commentId: number, text: string) => void;
  onResolve: (commentId: number) => void;
  onDelete: (commentId: number) => void;
}

interface CommentInfo {
  id: number;
  author: string;
  text: string;
  time: string;
  quote?: string;            // 关联的文档文本引用
  replies?: CommentInfo[];
  resolved: boolean;
}
```

---

## 3. Hook 契约 — useComments

```typescript
interface UseCommentsReturn {
  comments: CommentInfo[];

  addComment(text: string): number | null;    // 对当前选区添加批注
  replyToComment(commentId: number, text: string): void;
  resolveComment(commentId: number): void;
  deleteComment(commentId: number): void;

  // Agent 修订建议
  pendingChanges: TrackedChangeInfo[];   // Agent 生成的修订建议
  acceptChange(changeId: string): void;
  rejectChange(changeId: string): void;
  acceptAllChanges(): void;
  rejectAllChanges(): void;
}

function useComments(): UseCommentsReturn;
```

---

## 4. Agent 修订建议交互

```
Agent 返回修订建议
  → useAgentCommands.parseResponse(response)
  → 如果 response.commands 包含 TrackedChange 类型
  → useComments.pendingChanges.push(...changes)
  → 文档中标记 changed 区域（agent-suggestion CSS class）
  → 用户点击建议区域 → SuggestionPopover（接受/拒绝）
  → acceptChange → bridge.getAgent().executeCommands([accept-tracked-change])
```

修订建议由 `@eigenpal/docx-editor-agents` 的 `DocxReviewer` 处理。

---

## 5. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useDocumentStore` | 无 | `editorBridge` |
| `useAgentStore` | 无 | 消息历史（提取修订建议） |

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `review.comments` | 批注 | Comments |
| `review.addComment` | 添加批注 | Add Comment |
| `review.reply` | 回复 | Reply |
| `review.resolve` | 解决 | Resolve |
| `review.delete` | 删除 | Delete |
| `review.resolved` | 已解决 | Resolved |
| `review.noComments` | 暂无批注 | No comments |
| `review.changes` | 修订建议 | Suggested Changes |
| `review.accept` | 接受 | Accept |
| `review.reject` | 拒绝 | Reject |
| `review.acceptAll` | 全部接受 | Accept All |
| `review.rejectAll` | 全部拒绝 | Reject All |
