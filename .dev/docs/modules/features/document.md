# features/document — 文档管理

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-010~017
> **依赖**：`@eigenpal/docx-editor-core`（parseDocx, createDocx）
> **状态**：草案

---

## 1. 模块结构

```
features/document/
├── components/
│   └── DocumentTitleBar.tsx     # 窗口标题栏（文件名 + 修改标记 + traffic lights）
├── hooks/
│   ├── useDocument.ts           # 文档生命周期
│   ├── useAutoSave.ts           # F-016 自动保存 + 崩溃恢复
│   └── useRecentFiles.ts        # F-014 最近文件
```

---

## 2. 组件契约

### DocumentTitleBar

```typescript
// 无需 props，直接读取 store
// 渲染：traffic lights + 文档名 + 修改标记
```

---

## 3. Hook 契约

### useDocument

```typescript
interface UseDocumentReturn {
  // 状态
  documentPath: string | null;
  isDirty: boolean;

  // 操作
  newDocument(): Promise<void>;
  openDocument(): Promise<void>;        // 打开文件对话框
  openDocumentPath(path: string): Promise<void>;  // 直接打开指定路径
  saveDocument(): Promise<void>;         // 保存到原路径
  saveDocumentAs(): Promise<void>;       // 另存为对话框
  closeDocument(): void;
}
```

内部流程：
```
openDocument()
  → Tauri dialog.open() 选择 .docx 文件
  → Tauri command read_file(path) → ArrayBuffer
  → parseDocx(buffer) → Document
  → useDocumentStore.setDocument(document, buffer, path)
  → DocxEditor 重新渲染
```

### useAutoSave

```typescript
interface UseAutoSaveReturn {
  isAutoSaving: boolean;
  lastSavedAt: number | null;
  recoverDraft(): Promise<boolean>;  // 崩溃恢复
}
```

策略：
- `useSettingsStore.editorConfig.autoSave === true` 时启用
- 文档变更后 30s 防抖 → 序列化到临时目录（`$TMP/Raven/drafts/{fileHash}.docx`）
- 正常关闭时删除临时草稿
- 启动时检查是否存在孤儿草稿 → 提示用户恢复

### useRecentFiles

```typescript
interface UseRecentFilesReturn {
  recentFiles: RecentFile[];           // 最近 10 个文件
  addRecentFile(path: string): void;   // 添加到列表
  removeRecentFile(path: string): void;
  clearRecentFiles(): void;
}

interface RecentFile {
  path: string;
  name: string;
  lastOpenedAt: number;
}
```

存储：`localStorage` key `Raven:recent-files`，使用 Tauri 路径。

---

## 4. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useDocumentStore` | `setDocument()`, `setDirty()`, `setPath()` | `documentPath`, `isDirty`, `documentBuffer` |
| `useSettingsStore` | 无 | `editorConfig.autoSave` |

---

## 5. Tauri 依赖

| 命令 | 用途 |
|------|------|
| `open_docx(path)` → `Vec<u8>` | 读取 .docx 字节 |
| `save_docx(path, data)` | 写入 .docx 字节 |
| `get_recent_files()` → `Vec<RecentFile>` | Rust 端读取系统最近文件 |
| `pick_file_dialog()` → `Option<String>` | 原生文件选择对话框 |
| `save_file_dialog()` → `Option<String>` | 原生保存对话框 |

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `document.new` | 新建文档 | New Document |
| `document.open` | 打开文档 | Open Document |
| `document.save` | 保存 | Save |
| `document.saveAs` | 另存为 | Save As |
| `document.close` | 关闭 | Close |
| `document.unsavedChanges` | 有未保存的修改，是否保存？ | Unsaved changes. Save? |
| `document.recoverDraft` | 发现未保存的草稿，要恢复吗？ | Unsaved draft found. Recover? |
| `document.openError` | 无法打开文档：{error} | Cannot open document: {error} |
| `document.saveError` | 无法保存文档：{error} | Cannot save document: {error} |
