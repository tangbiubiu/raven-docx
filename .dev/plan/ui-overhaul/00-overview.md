# UI 重构 — 总体实施规划(分支协调)

> **版本**: v0.2(评审修订)
> **最后更新**: 2026-08-13
> **状态**: 已批准(主计划 `.dev/plan/ui-overhaul.md`,本文件为其分支协调版)

---

## 1. 这是什么

UI 重构的**分支协调入口**。主计划按阶段(Phase 0-6)描述做什么,本文件回答**谁、并行、合入顺序、冲突怎么办**。每个分支的详细实施计划见同目录 `p0-*.md` ~ `p5-*.md`。

**背景速览**(详细见各分支文档第 1 节):
Raven 是 Word 类 docx 编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix + lucide),编辑器核心是第三方包 `@eigenpal/docx-editor-react`(别动)。界面"乱"的根因:布局 bug + 模式不统一 + 视觉扁平(全灰阶无 accent、字号细碎、顶部 chrome 约 170px)。已决策:**不重写架构,换皮+修 bug**。三个已批准决策:D1 蓝色 accent `oklch(0.58 0.18 255)`;D2 标尺修好;D3 顶部按 MS Word 布局。

## 2. 分支总览

| 分支 | 对应阶段 | 预计 | 文件所有权(热文件加粗) | 依赖 |
| ------ | ---------- | ------ | ------------------------ | ------ |
| `ui/p0-tokens` | Phase 0 | 0.5d | `src/index.css`(唯一) | 无 |
| `ui/p1-word-layout` | Phase 1 | 1-2d | `ribbon-config.ts`、`useAppStore.ts`(RibbonTab)、`Ribbon.tsx`、新建 `tabs/FileTab.tsx`、`menu-config.ts`、`menu-bar.tsx`(删)、menubar 目录(删)、**`WorkspacePage.tsx`**、`i18n/en.ts`+`zh-CN.ts` | 无(建议 p0 先合入以看到蓝色) |
| `ui/p2-ruler` | Phase 2 | 1.5d | `Ruler.tsx`、**`WorkspacePage.tsx`**、`useAppStore.ts`、**`agent-sidebar.tsx`(独占,吸收 p4/p5 的该文件工作)** | 合入前 rebase 到含 p1 的 main |
| `ui/p3-dialogs` | Phase 3 | 1d | `InsertTab.tsx`、`ReviewTab.tsx`、`ReferencesTab.tsx`、`SettingsDrawer.tsx` | 无(全独立,可随时合入) |
| `ui/p4-icons` | Phase 4 | 0.5d | `theme-toggle.tsx`、`quick-actions.tsx`、`command-palette.tsx` | 无(agent-sidebar/comment-panel 的 SVG 分别由 p2/p5 承接) |
| `ui/p5-ribbon-panels` | Phase 5 | 1d | `RibbonGroup.tsx`、`RibbonButton.tsx`、`RibbonToggleButton.tsx`、`FormatPainter.tsx`、`ColorPicker.tsx`、**`Ribbon.tsx`**、`RibbonSeparator.tsx`、`OutlinePanel.tsx`、`comment-panel.tsx`(独占,含其 SVG 换 lucide)、**`WorkspacePage.tsx`**(标题行按钮) | 合入前 rebase 到最新 main |

> 注:Phase 6(回归验证)不设分支,由协调人在所有分支合入后统一执行(见 §6)。

## 3. 推荐合入顺序

```text
main
├── ui/p0-tokens        (视觉基线,最先合入,供其他分支走查时看到蓝色)
├── ui/p1-word-layout   (结构性改动,第二个合入)
├── ui/p2-ruler         (rebase 到含 p1 的 main 后合入)
├── ui/p3-dialogs       (与 p2 并行,无依赖,任意时间合入)
├── ui/p4-icons         (与 p2 并行,无依赖,任意时间合入)
└── ui/p5-ribbon-panels (rebase 到最新 main 后最后合入)
```

理由:热文件已按"单分支独占"收敛(agent-sidebar → p2,comment-panel → p5),剩余冲突仅在 `WorkspacePage.tsx`(p1/p2/p5)与 `Ribbon.tsx`(p1/p5),且区域互不相邻。p1 合入后,p2/p3/p4 三个分支可真正并行,最后 p5 收尾。

**并行收益说明(评审修正)**: 并行架构面向**多人/多 agent 执行**。单人执行时 worktree + rebase 是净成本,推荐按 `p0→p1→p2→p3/p4/p5(任意序)→p5` 顺序串行推进,其中 p3/p4 随时可插入;热文件独占设计保证即使并行,每个分支也只需 rebase 一次。

## 4. 冲突矩阵与解析

| 文件 | 涉及分支 | 冲突区域 | 解析 |
| ------ | ---------- | ---------- | ------ |
| `WorkspacePage.tsx` | p1, p2, p5 | p1 删 `<MenuBar>` 行; p2 改 Ruler 条件渲染(~3 行); p5 改标题行按钮(仅 p1 合入后执行) | 区域互不相邻;p2/p5 合入前 rebase,合并后手动保留三者 |
| `Ribbon.tsx` | p1, p5 | p1:import + TAB_COMPONENTS 注册 FileTab;p5:面板高度 `h-[88px]` 与分隔样式 | 区域不同,冲突极小;p5 以最新 main 为准 |
| `useAppStore.ts` | p1, p2 | p1:RibbonTab 加 "file";p2:rulerVisible 默认值、AppModal 清理 | 区域不同,无实质冲突 |
| `agent-sidebar.tsx` | **p2 独占** | 不再被 p4/p5 触碰(activeTab 接线 + SVG→lucide + 头部样式一次做完) | 无冲突 |
| `comment-panel.tsx` | **p5 独占** | 头部样式 + SVG→lucide 一次做完 | 无冲突 |

**铁律**:合入前 `git pull origin main --rebase` 到最新;热文件改动以合并后的代码为准,不要基于旧版硬 rebase。

## 5. 共享约定

- **切分支**(以 p1 为例):

  ```bash
  git switch main && git pull
  git switch -c ui/p1-word-layout
  git worktree add ../raven-wt-p1 ui/p1-word-layout   # 并行工作区
  cd ../raven-wt-p1 && bun install
  ```

- **提交风格**:conventional commits(repo 有 commitlint + lefthook),如 `feat(ribbon): add file tab`、`style(theme): blue accent tokens`。
- **合入前验证**(全部通过才允许合入):

  ```bash
  bun run typecheck
  bunx biome check      # biome (ultracite wrapper 存量损坏)
  bun test               # vitest 全量
  ```

- **i18n 铁律**:新增 i18n 键必须 `en.ts` + `zh-CN.ts` 成对提交,缺失视为合入阻断。
- **边界(任何分支不得越界)**:不动 editor 集成(`useEditorBridge`/`commands.ts`/`format-apply.ts`)、不动 store 语义重构(本次仅 p2 的少量默认值/清理)、不加新依赖、不改 i18n 键名。
- **验收走查**:每分支合入前,亮/暗模式各截一张主界面图,附在合入说明里。

## 6. 合入后收尾(Phase 6,协调人执行)

1. 全量验证:`bun run typecheck` + `bun run check` + `bun test`。
2. 全局搜索清零检查:`bg-white`(弹窗内)、emoji 图标、`hover:scale-`、`text-[10px]` 新用例、`fixed inset-0` 非 Dialog 弹层。
3. 亮/暗截图走查清单(来自主计划 P6):Home tab、Insert/Review 弹窗、标尺开关、侧栏折叠浮层、窄窗口 Ribbon 折叠、文件 tab。
4. 走查遗留问题开 issue 或直接修,收尾完成后更新 `ui-overhaul.md` 状态为已实施。

## 7. 风险与应急

| 风险 | 缓解 |
| ------ | ------ |
| 热文件多分支冲突 | §4 矩阵 + 热文件单分支独占(agent-sidebar→p2,comment-panel→p5)+ 合入顺序 |
| DocxEditor 页面居中行为未知,标尺对齐偏差 | p2 内 ResizeObserver 兜底方案(见 p2 文档) |
| 删菜单栏导致功能不可达 | p1 内置逐项核对清单,以核对结果为合入门 |
| 并行期间 main 上出现新改动 | 合入前一律 rebase 最新 main,谁后合入谁负责解决 |

## 8. 分支文档索引

| 文档 | 内容 |
| ------ | ------ |
| `p0-tokens.md` | 设计 Token:蓝色 accent + 字号刻度 |
| `p1-word-layout.md` | 顶部按 Word:删菜单栏、文件 tab |
| `p2-ruler.md` | 标尺修复 + 死控件清理 |
| `p3-dialogs.md` | 弹窗统一到 radix Dialog |
| `p4-icons.md` | 图标统一到 lucide |
| `p5-ribbon-panels.md` | Ribbon 视觉细节 + 面板壳统一 |
