# features/table — 表格编辑

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-080~086
> **状态**：草案

---

## 1. 模块结构

```
features/table/
├── components/
│   ├── InsertTableGrid.tsx       # 网格选择插入表格
│   └── TableContextMenu.tsx      # 右键菜单（行列操作/合并拆分/样式）
└── hooks/
    └── useTableOperations.ts    # 表格操作编排
```

---

## 2. 组件契约

### InsertTableGrid

```typescript
interface InsertTableGridProps {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

// 交互：鼠标悬停 N×M 格子 → 高亮 → 点击确认
// 默认 10×10 网格，可拖拽扩展
```

### TableContextMenu

```typescript
// 当光标在表格内右键时显示
// 菜单项：
//   - 在上方插入行 / 在下方插入行
//   - 在左侧插入列 / 在右侧插入列
//   - 删除行 / 删除列
//   - 删除表格
//   - 合并单元格 / 拆分单元格
//   - 表格属性（列宽/对齐/缩进）
```

---

## 3. Hook 契约 — useTableOperations

```typescript
interface UseTableOperationsReturn {
  isInTable: boolean;

  insertTable(rows: number, cols: number): void;
  insertRow(position: "above" | "below"): void;
  insertColumn(position: "left" | "right"): void;
  deleteRow(): void;
  deleteColumn(): void;
  deleteTable(): void;
  mergeCells(): void;
  splitCell(): void;
  setColumnWidth(colIndex: number, width: number): void;
  setTableStyle(styleId: string): void;
}

function useTableOperations(): UseTableOperationsReturn;
```

---

## 4. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useDocumentStore` | 无 | `editorBridge` |

所有表操作通过 `bridge.getAgent().insertTable(...)` 等 `DocumentAgent` API 完成。

---

## 5. Tauri 依赖

无。docx-editor 的 ProseMirror TableExtension 已处理表格渲染与编辑。

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `table.insert` | 插入表格 | Insert Table |
| `table.rows` | 行 | rows |
| `table.cols` | 列 | cols |
| `table.insertRowAbove` | 在上方插入行 | Insert Row Above |
| `table.insertRowBelow` | 在下方插入行 | Insert Row Below |
| `table.insertColLeft` | 在左侧插入列 | Insert Column Left |
| `table.insertColRight` | 在右侧插入列 | Insert Column Right |
| `table.deleteRow` | 删除行 | Delete Row |
| `table.deleteCol` | 删除列 | Delete Column |
| `table.deleteTable` | 删除表格 | Delete Table |
| `table.mergeCells` | 合并单元格 | Merge Cells |
| `table.splitCell` | 拆分单元格 | Split Cell |
| `table.properties` | 表格属性 | Table Properties |
