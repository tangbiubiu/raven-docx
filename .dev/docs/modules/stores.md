# stores — 全局状态（Zustand）

> **方案**：Zustand，4 个独立 store
> **原因**：轻量、无 Provider 包裹、与 React Compiler 兼容
> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**：草案

---

## 1. 为什么是 4 个独立 store

不合并为单一大 store 的原因：
- 各域职责边界清晰，耦合度低
- 避免一个 store 变更导致全 tree re-render
- 方便按需订阅（`useDocumentStore(s => s.isDirty)`）

---

## 2. useDocumentStore — 文档状态

```typescript
// stores/useDocumentStore.ts

interface DocumentState {
  // --- 文档数据 ---
  document: Document | null;           // @eigenpal/docx-editor-core Document 对象
  documentBuffer: ArrayBuffer | null;  // 原始 OOXML 字节（用于保存）
  documentPath: string | null;         // 本地文件路径
  isDirty: boolean;                     // 是否有未保存修改

  // --- 编辑器桥接 ---
  editorBridge: EditorBridge | null;   // 暴露给其他 feature 的编辑器操作接口

  // --- 选区 ---
  selectionInfo: SelectionInfo | null;
  selectionFormat: FormatState | null;  // 当前选区格式（用于 Toolbar 状态同步）

  // --- 布局 ---
  zoom: number;                         // 百分比，默认 100
  totalPages: number;
  currentPage: number;

  // --- 撤销重做 ---
  canUndo: boolean;
  canRedo: boolean;

  // --- Actions ---
  setDocument(doc: Document, buffer: ArrayBuffer, path: string | null): void;
  setDirty(dirty: boolean): void;
  setPath(path: string | null): void;
  setEditorBridge(bridge: EditorBridge): void;
  setSelection(info: SelectionInfo | null): void;
  setSelectionFormat(format: FormatState | null): void;
  setZoom(zoom: number): void;
  setPageInfo(current: number, total: number): void;
  setCanUndoRedo(canUndo: boolean, canRedo: boolean): void;
  closeDocument(): void;   // 清空所有文档状态
}

// 创建
import { create } from "zustand";
export const useDocumentStore = create<DocumentState>((set) => ({
  // ...
}));
```

订阅示例：
```typescript
// Toolbar 中
const { canUndo, canRedo } = useDocumentStore(s => ({
  canUndo: s.canUndo, canRedo: s.canRedo
}));

// StatusBar 中
const { currentPage, totalPages, isDirty } = useDocumentStore();
```

---

## 3. useAgentStore — Agent 会话状态

```typescript
// stores/useAgentStore.ts

interface AgentState {
  // --- 会话 ---
  status: AgentSessionStatus;
  // "disconnected" | "connecting" | "ready" | "busy" | "error"
  error: string | null;

  // --- 消息 ---
  messages: AgentMessage[];

  // --- 上下文 ---
  contextBadge: AgentContextBadge | null;

  // --- 流式 ---
  currentStreamingId: string | null;  // 正在流式输出的消息 ID

  // --- Actions ---
  setStatus(status: AgentSessionStatus): void;
  setError(error: string | null): void;
  addMessage(message: AgentMessage): void;
  updateMessage(id: string, content: string): void;  // 流式追加
  finishStreaming(id: string): void;
  setContextBadge(badge: AgentContextBadge | null): void;
  clearMessages(): void;
  reset(): void;  // 断开连接时重置
}
```

消息追加流程：
```
sendMessage(text)
  → addMessage({ id, role: "user", content: text, isStreaming: false })
  → setStatus("busy")
  → addMessage({ id, role: "agent", content: "", isStreaming: true })
  → setCurrentStreamingId(id)

Tauri Event "pi:text_delta" { text }
  → updateMessage(currentStreamingId, currentContent + text)

Tauri Event "pi:agent_end"
  → finishStreaming(currentStreamingId)
  → setStatus("ready")
```

---

## 4. useSettingsStore — 全局设置

```typescript
// stores/useSettingsStore.ts

interface SettingsState {
  isLoaded: boolean;        // 异步加载完成标记
  apiConfig: ApiConfig;
  modelConfig: ModelConfig;
  editorConfig: EditorConfig;

  setApiConfig(config: Partial<ApiConfig>): void;
  setModelConfig(config: Partial<ModelConfig>): void;
  setEditorConfig(config: Partial<EditorConfig>): void;

  // 初始化：从 localStorage + Keychain 加载
  loadFromStorage(): Promise<void>;  // 完成后设置 isLoaded = true

  // 持久化：写入 localStorage（apiKey 写入 Keychain）
  persist(): Promise<void>;

  // 重置
  resetAll(): void;
}
```

初始化顺序（需要异步加载 apiKey）：
```
loadFromStorage()
  → localStorage.getItem("Raven:settings") → JSON.parse
  → setApiConfig, setModelConfig, setEditorConfig
  → Tauri read_api_key(apiType) → set apiKey
  → isLoaded = true
```

---

## 5. useAppStore — 应用级状态

```typescript
// stores/useAppStore.ts

// ⚠️ 持久化说明：outlinePanelCollapsed / agentSidebarOpen 需跨会话持久化（见 data-persistence.md §3.1）。
// 方案 A：将这两个字段放在 useSettingsStore.editorConfig 中（利用 SettingsStore 已有的 persist 机制）
// 方案 B：useAppStore 单独加 Zustand persist middleware 绑定 Tauri fs
// 以下 interfaces 按方案 B 编写，实施前确认最终选择。

interface AppState {
  // 浮层栈（全局 Portal）
  activeModal: "commandPalette" | "findReplace" | "pageSetup" | "hyperlink" | "insertTable" | null;
  
  // 侧边面板
  settingsDrawerOpen: boolean;
  agentSidebarOpen: boolean;     // 需持久化
  outlinePanelCollapsed: boolean; // 需持久化

  // 加载
  isInitialLoading: boolean;

  // Actions
  openModal(id: string): void;
  closeModal(): void;
  toggleSettingsDrawer(): void;
  toggleAgentSidebar(): void;
  toggleOutlinePanel(): void;
  setInitialLoading(loading: boolean): void;
}
```

---

## 6. Store 间通信规则

| 方向 | 允许？ | 说明 |
|------|--------|------|
| Feature → 对应 Store | ✅ | 写入该 feature 所属的 store |
| Feature → 其他 Store | ✅（读）| 允许跨 store 读取，如 Toolbar 读 `useDocumentStore.selectionFormat` |
| Store → Store | ❌ | Store 之间不相互引用，保持独立 |
| Store → Tauri | ✅ | Store action 内部可以调用 Tauri command |

---

## 7. 文件清单

```
stores/
├── useDocumentStore.ts
├── useAgentStore.ts
├── useSettingsStore.ts
└── useAppStore.ts
```

总共约 200~300 行代码（含 Zustand 样板）。