# 前端 UI 重构计划 (UI Overhaul)

> **版本**: v0.2
> **最后更新**: 2026-08-13
> **状态**: 已批准(并行分支版)
> **来源**: 前端布局走查 + `.dev/proto/workspace.html`(设计意图)
> **📂 分支协调入口**: 本计划已拆分为 6 个并行分支(worktree),协调规则(合入顺序/冲突矩阵/共享约定)见 **`.dev/plan/ui-overhaul/00-overview.md`**,各分支实施计划见同目录 `p0-tokens.md` ~ `p5-ribbon-panels.md`。

---

## 0. 目标

不重写架构,只换皮 + 修 bug。当前界面"乱"的根因是三层叠加:**布局 bug → 模式不统一 → 视觉扁平**。本计划逐层处理,全部在现有 store/命令层/i18n 之上进行,不碰编辑器集成。

预计工作量:**5.5 ~ 7.5 个工作日**(单人串行);多人/多 agent 并行时按 `.dev/plan/ui-overhaul/00-overview.md` 分支切分,墙钟时间可压缩到 ~3d。每阶段有验收门,阶段间可停下评审。

---

## 1. 决策记录

| # | 决策点 | 结论 | 默认落实 |
| --- | -------- | ------ | ---------- |
| D1 | 强调色 | 采用设计稿蓝色 `oklch(0.58 0.18 255)`(Linear/Vercel 风格) | primary/焦点态/选中态用蓝,亮暗各一套,保持 WCAG 对比 |
| D2 | 标尺 | 保留并修好 | 水平标尺与页面居中对齐;垂直标尺贴页面左缘、不覆盖内容;开关接真实状态;默认显示(与 Word 一致) |
| D3 | 顶部布局 | 尽可能按 MS Word | 删除独立菜单栏行;"文件"入口收进 Ribbon 最左侧 tab;标题栏保留文档名+状态+设置 |

**默认决策(未单独询问,评审时可推翻)**:

- D3a: "文件"tab 用下拉浮层(新建/打开/保存/另存为),复用 `menu-config.ts` 的文件分组数据源,不做全屏 Backstage(`ponytail:` 简化,需要时再升级)。
- D3b: 菜单栏其余菜单项(编辑/插入/格式/页面布局/视图/Agent)均已存在于对应 Ribbon tab,直接删除,不做搬运。快捷键不受影响(均在全局 hooks)。
- D2a: 垂直标尺不做滚动同步,只显示第 1 页(`ponytail:` 已知上限,升级路径见 Phase 2)。

---

## 2. 现状问题清单(走查结论)

见 `.dev` 走查记录,要点:

- **布局 bug**: 标尺开关死控件;水平/垂直标尺与居中页面错位、垂直标尺压内容;`commentPanelOpen` store 字段写了没人读("新建批注"不切到批注页)。
- **模式不统一**: 5 种弹窗实现(① store modal(含 CommandPalette/PageSetup 等)② tab 内裸 modal ③ SettingsDrawer 自绘 ④ Ribbon 窄屏浮层 ⑤ PanelPopover);InsertTab/ReviewTab/ReferencesTab 硬编码 `bg-white` 暗色模式破裂;图标三套体系(lucide / emoji / 手写 SVG);三个侧栏三种面板壳。
- **视觉扁平**: 全站零 accent 色(primary 亮色=黑、暗色=白);字号过度细碎(10-12px 遍地);顶部 4 行 chrome 约 170px;Ribbon 双重分隔 + 控件高度参差(h-12 图标 vs h-7 Select)+ `hover:scale-105` 跳动。

---

## 3. 目标布局

```text …… 模板 | 主题 | 设置 ┐   (保留现有 DocumentTitleBar 行)
├─────── Ribbon 标签栏 ───────────────────────────┤   ← 左端新增「文件」
│ 文件 | 开始 | 插入 | 布局 | 引用 | 审阅 | 视图   │
├─────── Ribbon 面板 (统一高度/控件节奏) ──────────┤
│ 主区: 大纲(可折叠) | 标尺+编辑器 | Agent(可折叠) │   (垂直标尺贴页面左缘)
├────────────── 状态栏 ───────────────────────────┤
```

对照 Word:标题栏(文档名+工具按钮)≈ Word 标题栏;Ribbon ≈ Word Ribbon(文件 tab 取代菜单栏);标尺/状态栏原样。删除:独立菜单栏行。

---

## 4. 阶段执行计划

### Phase 0 — 视觉基础:设计 Token(0.5d)

**目标**: 建立颜色/字号/间距基线,后续所有阶段共用。

任务:

1. `src/index.css`:
   - `:root` 与 `.dark` 各新增蓝色 primary 族:`--primary: oklch(0.58 0.18 255)`(亮)/ 亮蓝如 `oklch(0.72 0.16 255)`(暗,配深色前景),`--ring` 同步;校验对比度。
   - 保持 `--accent`(hover 底色)为灰,不混用 primary。
   - 定字号刻度:正文 13-14px、面板头 12px、元信息 11px,记录为注释规范,禁止再出现 `text-[10px]` 新用例。
2. 全局扫一遍 `text-[1-9]px` / `text-[1-2][0-9]px` 硬编码字号,归入刻度。

验收: 亮/暗模式下主按钮、选中态、焦点环、链接均为蓝;截图对比前后层级感。

### Phase 1 — 顶部按 Word 布局重构(1~2d)

**目标**: 删除菜单栏行,文件操作收进 Ribbon。

任务:

1. `src/features/ribbon/`: `RIBBON_TABS` 前端加 "file" tab;新 `tabs/FileTab.tsx` 渲染下拉浮层,数据源复用 `src/features/menubar/menu-config.ts` 的文件分组(新建/打开/保存/另存为)。
2. 删除 `src/features/menubar/components/menu-bar.tsx` + 相关调用;`WorkspacePage.tsx` 移除 `<MenuBar>` 行与 `menuCallbacks` 中仅菜单使用的回调。
3. 核对覆盖:编辑/插入/格式/页面布局/视图/Agent 各菜单项中,**多数**已有 Ribbon 等价按钮;另有 **7 个死菜单项**(`file:close`/`edit:cut`/`edit:copy`/`edit:paste`/`edit:find`/`format:clear`/`help:about`,switch 无 case、点击无动作)删除即清理(明细见 `p1-word-layout.md` §4.6)。全部确认后删除 `menu-config.ts` 冗余分组(文件分组移交 FileTab 后整体删除)。
4. Ribbon 标签栏左侧文件 tab 样式与其他 tab 一致;`⌘N/⌘O/⌘S` 快捷键走查一遍(不应受影响,确认无回归)。

验收: 顶部少一行(省 ~36px);文件 tab 可完成新建/打开/保存;菜单功能无丢失;快捷键全通。

### Phase 2 — 布局与死控件修复(1d)

任务:

1. **标尺修复** `src/features/editor/components/Ruler.tsx` + `WorkspacePage.tsx`:
   - 水平标尺改居中:外层 `flex justify-center`,内层宽度 = 页面宽,标尺画在内层 → 与 DocxEditor 居中页面天然对齐(若库对页面有额外内边距导致偏移,改用 ResizeObserver 实测偏移量兜底)。
   - 垂直标尺画在同一居中列左缘(`left-0` 相对页面列),不再覆盖编辑器内容;纵向位置对齐第 1 页实际顶部(测量/降级方案见 `p2-ruler.md` §4.2);不做滚动同步(D2a)。
   - `ViewTab` 的开关接真实状态;`WorkspacePage` 按 `rulerVisible` 条件渲染 `<Ruler />`;默认值改 `true`。
2. **批注入口修复**: `onNewComment` 改为让 AgentSidebar 切到批注页 —— 将 `AgentSidebar` 的 `activeTab` 提升到 `useAppStore`(或加 prop),`commentPanelOpen` 废弃或改语义。
3. 顺手清理 `useAppStore.ts` 中 `AppModal` 死分支(`hyperlink/insertTable/insertImage/footnote` 从未被 store 打开)。

验收: 任意窗口宽度下标尺边距标记与页面边距对齐;开关生效;新建批注直达批注页。

### Phase 3 — 弹窗统一(1d)

任务:

1. InsertTab/ReviewTab/ReferencesTab 的三个裸 modal 全部改用现有 `src/components/ui/dialog.tsx`(radix),`bg-white` → `bg-background`,补 Escape 关闭。
2. `SettingsDrawer` 评估是否改用 `src/components/ui/sheet.tsx`(可选,若改动风险大则只统一遮罩透明度)。
3. 全项目过一遍 `fixed inset-0` 弹层,统一遮罩 `bg-black/50`、圆角、padding。

验收: 暗色模式无白块;所有弹窗 Esc 可关;截图亮/暗各走查一遍。

### Phase 4 — 图标统一(0.5d)

任务:

1. `theme-toggle.tsx` 🌙/☀️ → lucide `Sun/Moon`。
2. `quick-actions.tsx` 8 个 emoji → lucide 图标(icon 字段类型 `string` → `LucideIcon`)。
3. `command-palette.tsx` 内 emoji → lucide。
4. `agent-sidebar.tsx` / `comment-panel.tsx` 手写内联 SVG(清空/关闭/错误图标)→ lucide `Trash2/X/AlertCircle/RefreshCw` 等。

验收: 全项目无 emoji/手写 SVG 图标(搜索 `🌙|☀️|✏️|✨|…` 与 `<svg` 清零)。

### Phase 5 — Ribbon 与面板视觉细节(1d)

任务:

1. **Ribbon 去双重分隔**: `RibbonGroup.tsx` 的 `border-t` 与 `RibbonSeparator` 竖线二选一(保留分隔线,去掉分组标签上边框,或反之)。
2. **控件高度规范**: 定义并落地统一节奏 —— 图标按钮 44px 高、下拉控件 28px,分组内统一 `items-end` 对齐;`h-[88px]` 面板高度按实际内容收紧;去掉 `hover:scale-105` / `active:scale-95`。
3. **面板壳统一**: OutlinePanel / AgentSidebar / CommentPanel 头部统一高度、字号、padding 规范。
4. 顶部标题行按钮统一(模板按钮加图标,与主题/设置同款式)。

验收: Ribbon 无横向滚动(标准窗口宽度下 Home 不超宽);三个侧栏头部长得一样;无缩放 hover 动效。

### Phase 6 — 回归验证(0.5~1d)

任务:

1. `bun test` 全量跑(66 个测试文件);因 class/结构断言失败的用例逐个修。
2. `bun run typecheck` + `bun run check`(biome)。
3. 亮/暗模式截图走查:首页 Home tab、Insert/Review 弹窗、标尺开/关、侧栏折叠浮层、窄窗口 Ribbon 折叠。

验收: 全绿 + 走查清单无遗留。

---

## 5. 时间线总表

| 阶段 | 内容 | 预计 | 验收门 |
| ------ | ------ | ------ | -------- |
| P0 | 设计 Token(蓝 accent/字号刻度) | 0.5d | 截图对比 |
| P1 | 顶部 Word 布局(删菜单栏+文件 tab) | 1-2d | 功能核对 |
| P2 | 标尺修复 + 死控件清理 | 1d | 对齐实测 |
| P3 | 弹窗统一 | 1d | 暗色走查 |
| P4 | 图标统一 | 0.5d | 搜索清零 |
| P5 | Ribbon/面板视觉细节 | 1d | 走查 |
| P6 | 回归 | 0.5-1d | 测试全绿 |
| **合计** | | **5.5-7.5d** | |

建议 P1 完成后停下做一次评审(顶部结构是唯一动架构的改动),再继续 P2-P6。并行执行时: p1 合入后 p2/p3/p4 可并行, p5 最后收尾(详见 `00-overview.md` §3)。

---

## 6. 不做的事(边界)

- 不重写 editor 集成、命令层、store、i18n —— 现状是好的,风险全在这里。
- 不加新依赖(图标用已有 lucide,弹窗用已有 radix dialog)。
- 不做全屏 Backstage、不做 QAT(D3a 简化,需要时再升级)。
- 不做移动端/响应式大改(保留现有 768px Ribbon 折叠逻辑)。
- 垂直标尺不做滚动同步(D2a 已知上限)。

## 7. 风险

| 风险 | 缓解 |
| ------ | ------ |
| DocxEditor 页面居中行为未知,标尺对齐可能差一个内边距 | P2 实测,偏差则用 ResizeObserver 测量兜底 |
| 删除菜单栏导致某功能不可达 | P1 逐项核对清单,功能核对为验收门 |
| 66 个测试因 class 断言失败 | P6 统一修,测试全绿为验收门 |
| 暗色模式蓝色对比度不足 | P0 校验 WCAG,必要时调亮度 |
