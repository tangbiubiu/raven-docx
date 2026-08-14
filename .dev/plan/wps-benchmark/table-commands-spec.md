# 表格命令补齐 实施 spec

> 状态:待实施(依赖 commands/table.ts 已拆,handoff.md §2-B)

## 1. 现状与核心问题

### 1.1 已接线的 10 个命令(`src/features/editor/commands/table.ts`)

insertTable、mergeCells、splitCell、setCellBorder、setCellFillColor、applyTableStyle、setCellVerticalAlign、toggleHeaderRow、setRowHeight、setTableProperties —— 均来自 `@eigenpal/docx-editor-core/prosemirror/commands`(OOXML 感知,序列化 w:tbl 正确)。

### 1.2 核心问题:右键菜单用了不兼容的 prosemirror-tables

`src/features/table/hooks/useTableOperations.ts` 的行/列操作(addRowAbove/Below、addColumnLeft/Right、deleteRow/Column、mergeCells、splitCells、deleteTable)**用的是 `prosemirror-tables`(泛型 PM 表格库),不是 docx-editor-core 自己的表格命令**。

**不兼容证据**:

- docx-editor-core 的表格节点名是 **camelCase**:`table`、`tableRow`、`tableCell`、`tableHeader`
- prosemirror-tables 期望 **snake_case**:`table_row`、`table_cell`、`table_header`

`tableNodes(schema)` 按 snake_case 查 schema 会得到 undefined,`nodes.table_row.create()` 会抛错;addRowBefore 等命令找不到 `table_row` 节点会静默返回 false。**即右键菜单的表格操作当前大概率是失效/报错的**,需迁移到 docx-editor-core 自己的命令(与 ribbon 的 `execInsertTable` 同源)。

### 1.3 缺口:21 个 docx-editor-core 表格命令未包装

库共 32 个表格命令,已接 10 个,缺 21 个(见 §3)。

## 2. 目标

1. `commands/table.ts` 补全 21 个 `exec*` 包装(共 32 个)。
2. `useTableOperations.ts` 迁移:删 prosemirror-tables import,改用 `commands/table.ts`。
3. 新增 UI:边框(全部/内外/移除/颜色/线宽)、自动调整、均分列、单元格边距、文字方向、自动换行、选择行/列/表。

## 3. 补齐清单(21 个,含签名与包装形态)

**直接命令(已 `(state, dispatch) => boolean`,直接 `apply(cmd)`)—— 14 个**:

| 命令 | exec 包装 |
| --- | --- |
| addColumnLeft / addColumnRight | `execAddColumnLeft()` / `execAddColumnRight()` |
| addRowAbove / addRowBelow | `execAddRowAbove()` / `execAddRowBelow()` |
| deleteColumn / deleteRow / deleteTable | `execDeleteColumn()` / `execDeleteRow()` / `execDeleteTable()` |
| selectRow / selectColumn / selectTable | `execSelectRow()` / `execSelectColumn()` / `execSelectTable()` |
| removeTableBorders | `execRemoveTableBorders()` |
| setAllTableBorders(state, dispatch?, borderSpec?) | `execSetAllTableBorders(borderSpec)` |
| setInsideTableBorders / setOutsideTableBorders(同上) | `execSetInsideTableBorders(borderSpec)` / `execSetOutsideTableBorders(borderSpec)` |

**工厂命令(先调工厂得 Command,再 `apply(...)`)—— 7 个**:

| 命令 | exec 包装 |
| --- | --- |
| autoFitContents() | `execAutoFitContents()` |
| distributeColumns() | `execDistributeColumns()` |
| setCellMargins({top,bottom,left,right}) | `execSetCellMargins(margins)` |
| setCellTextDirection(dir \| null) | `execSetCellTextDirection(dir)` |
| setTableBorderColor(color) | `execSetTableBorderColor(color)` |
| setTableBorderWidth(size) | `execSetTableBorderWidth(size)` |
| toggleNoWrap() | `execToggleNoWrap()` |

> 包装统一用 `apply(...)`(shared.ts 已提供),无需写 view 获取逻辑。直接命令 `apply(addColumnLeft)`;工厂命令 `apply(setCellMargins({...}))`。

## 4. 实施步骤

### Step 1:table.ts 补 21 个 exec*(纯接线,低风险)

按 §3 清单在 `commands/table.ts` 补全。每个 ~3 行:`apply(cmd)` / `apply(factory(args))` + JSDoc。同时把 `index.ts` barrel 的 `export * from "./table"` 确认覆盖。

### Step 2:useTableOperations 迁移(修复右键菜单)

`useTableOperations.ts`:

1. 删除 `import { ... } from "prosemirror-tables"` 及 `tableNodes` 用法。
2. 改 `import { execAddRowAbove, execDeleteRow, ... } from "@/features/editor/commands/table"`。
3. 各操作函数体改为调用 exec*(`exec*` 内部已处理 getView,无需在 hook 里再取 view)。
4. `insertTable` 改用 `execInsertTable(rows, cols)`(ribbon 同源);`isInTableCell` 改用库的 `isInTable`(已从 `@eigenpal/docx-editor-core/prosemirror/commands` 导出,见 capability-audit)。

### Step 3:新增 UI(边框/自动调整等,需自绘)

- 右键菜单或表格工具栏加:`边框`(下拉:全部/外框/内框/移除)、`边框颜色`、`边框线宽`、`自动调整`、`均分列`、`单元格边距`、`文字方向`、`自动换行`。
- 库自带 `TableToolbar`/`TableBorderPicker`/`TableBorderColorPicker`/`TableBorderWidthPicker`/`TableCellFillPicker`/`TableInsertButtons`/`TableMergeButton` 组件可作参考(保留 Raven 自绘风格,逻辑参考)。
- 选择行/列/表:可接 `execSelectRow/Column/Table`(为后续删除/格式铺路)。

## 5. 验收标准

1. 右键菜单:增删行列/合并/拆分/删表 全部可用且**不报错**(当前 prosemirror-tables 版大概率已坏,迁移后应修复)。
2. 新增:设全部边框 → 序列化出 `w:tblBorders`;自动调整/均分列 → `w:tblLayout`/列宽正确;单元格边距 → `w:tcMar`。
3. 保存后 Word 打开表格结构正确。
4. `bun run typecheck && bunx biome check && bun run test` 全绿(719 it 基线);新增 exec 包装可加断言式单测(仿 commands.test.ts)。

## 6. 风险与注意

| 风险 | 应对 |
| --- | --- |
| prosemirror-tables 迁移后右键菜单行为变化 | 迁移后手动验证所有菜单项;不兼容处按库命令语义调整 |
| setAllTableBorders 的 borderSpec 缺省 | 缺省时不传第三参(库有默认边框),UI 提供 样式/线宽/颜色 |
| 工厂命令签名多态 | 严格按 §3 的 d.ts 签名包装,避免参数错位 |
| 表格样式 vs 手动边框冲突 | applyTableStyle 后手动边框会覆盖样式边框,UI 需明确二者关系(参考库 TableBorderPicker) |
