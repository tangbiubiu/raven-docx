# Backstage 全屏 + 状态栏缩放 实施 spec

> 状态:待实施(已决策:文件标签改全屏 Backstage 对标 WPS;状态栏缩放成组)

## A. Backstage 全屏(文件标签)

### A.1 现状

- `FileTab.tsx`:点击「文件」展开**下拉菜单**(4 项:新建/打开/保存/另存为),点击外部/Escape/执行动作后回 home tab。
- 渲染在 Ribbon 的 panel 区(`Ribbon.tsx` 的 `TAB_COMPONENTS.file = LazyFileTab`)。
- 布局:`WorkspacePage.tsx` = `DocumentTitleBar → Ribbon → Main → StatusBar`。

### A.2 目标

点击「文件」→ **全屏 Backstage 面板**,盖住整个工作区(标题栏+Ribbon+编辑区+状态栏),对标 Word/WPS:

- 左侧导航列 + 右侧内容区
- 左上「← 返回」按钮 + Escape 关闭,回到编辑(home tab)
- 关闭后不丢编辑状态(只是 `setActiveTab("home")`,文档照常)

### A.3 结构(最小可用版)

左导航项(基于**现有能力**,不新造功能):

| 导航项 | 内容/动作 | 数据源 |
| --- | --- | --- |
| 新建 | 新建文档 | `onNew`(现有回调) |
| 打开 | 打开文件对话框 | `onOpen` |
| 保存 | 保存 | `onSave` |
| 另存为 | 保存(别名,沿用现状) | `onSave` |
| 打印 | 打印/打印预览 | ViewTab 已有 `execPrint`/openPrintPreview |
| 信息 | 文档信息(路径/字数/页数/修订态) | `useDocumentStore`(documentPath/charCount/totalPages) |
| 设置 | 打开设置抽屉 | `SettingsDrawer`(现有) |
| 最近文件 | 最近文件列表(点击打开) | `commands.getRecentFiles`(bindings 已有) |

### A.4 实施要点

1. **新组件** `src/features/ribbon/components/FileBackstage.tsx`:全屏面板,左侧导航(竖列按钮)+ 右侧内容区(按选中项渲染)。左上「← 返回」按钮 → `setActiveTab("home")`;Escape 同。语义化:`role="dialog"` + `aria-label`。
2. **WorkspacePage 挂载**:当 `activeRibbonTab === "file"` 时,渲染 `<FileBackstage />` **替代**整个 `DocumentTitleBar+Ribbon+Main+StatusBar`(而非叠加),其余 tab 保持现状。判断用 `useAppStore((s) => s.activeRibbonTab)`。
3. **FileTab.tsx 废弃/改造**:下拉版 `FileTab` 不再需要,可删除或改造为 Backstage 内部复用其动作列表。Ribbon.tsx 的 `TAB_COMPONENTS.file` 映射移除(文件 tab 不再有 panel,由 WorkspacePage 兜底)。
4. **文件 tab 按钮**:仍在 tabs bar(最左),点击设 `activeTab = "file"`(现状已如此,无需改 tab 按钮逻辑,只改 panel 渲染路径)。
5. i18n 新增(成对 en/zh-CN):`backstage.back`(返回)、`backstage.info`(信息)、`backstage.recent`(最近文件)、`backstage.print`(打印)、`backstage.settings`(设置)等。

### A.5 验收

1. 点「文件」→ 全屏面板盖住工作区;点「← 返回」/Escape → 回编辑态,文档/选区不变。
2. 左导航各项动作生效(新建/打开/保存/打印/设置/最近文件)。
3. 其余 tab 切换不受影响。
4. 无 i18n 缺键;`bun run typecheck && bunx biome check && bun run test` 全绿。

## B. 状态栏缩放成组

### B.1 现状

`ZoomControl.tsx`:滑块(range 50–200)+ 百分比文本 + 重置按钮(zoom≠100 时显示「100%」)。`StatusBar.tsx` 里渲染。

### B.2 目标(对标 WPS)

`缩小 | 百分比 | 放大 | 最佳显示比例` 四控件成组,替换滑块。

| 控件 | 行为 |
| --- | --- |
| 缩小 `−` | zoom 降一档 |
| 百分比 | 显示当前 %,点击弹出预设档位下拉(50/75/100/125/150/200) |
| 放大 `+` | zoom 升一档 |
| 最佳显示比例 | 适配页面宽度(整页宽 = 视口宽) |

### B.3 实施要点

1. **档位助手**:库已导出 `getNextZoomPreset` / `getPreviousZoomPreset` / `getZoomPresets` / `clampZoom` / `formatZoom`(`@eigenpal/docx-editor-react`,见 hooks.d.ts)。缩放改用档位而非 ±5 step。
2. **最佳显示比例**:需「页面宽度 vs 视口宽度」计算 —— 从 `editorBridge.getLayout()` 读页面宽度(twips),与编辑区视口宽换算 `fit = floor(viewportW / pageWpx * 100)`,clamp 到 [50, 200]。若无 layout 则回退 100。
3. **改写 `ZoomControl.tsx`**(保留 `data-testid="zoom-control"`),`StatusBar.tsx` 不变。
4. i18n 新增:`editor.statusBar.zoomOut`(缩小)、`editor.statusBar.zoomIn`(放大)、`editor.statusBar.fitPage`(最佳显示比例);`editor.statusBar.zoom` 已存在。

### B.4 验收

1. `−`/`+` 按档位缩放,百分比实时更新,编辑器视图同步(`editorBridge.setZoom`)。
2. 「最佳显示比例」使页面宽度贴合视口;缩放范围 clamp 在 50–200。
3. 现有测试(StatusBar/ZoomControl)更新后全绿。

## C. 文件清单

- 新增:`src/features/ribbon/components/FileBackstage.tsx`
- 改:`src/pages/WorkspacePage.tsx`(file tab 时挂载 Backstage 替代主布局)
- 改/删:`src/features/ribbon/components/tabs/FileTab.tsx`、`Ribbon.tsx`(移除 file 的 TAB_COMPONENTS 映射)
- 改:`src/features/editor/components/ZoomControl.tsx`(档位 + 最佳显示比例)
- 改:`src/lib/i18n/en.ts`、`zh-CN.ts`(新增 backstage.*/ statusBar.* 键)

## D. 风险

| 风险 | 应对 |
| --- | --- |
| Backstage 全屏替换主布局时编辑器卸载 | 仅条件渲染(activeTab==="file" 时),非卸载 EditorPane 组件本身?若卸载会导致选区/滚动丢失 → 用 CSS 隐藏(display:none)而非卸载 |
| 最佳显示比例拿不到 layout | getLayout() 可能返回 null → 回退 100,不报错 |
| 打印/设置入口重复 | Backstage 复用 ViewTab 的打印、SettingsDrawer,不新造命令 |
