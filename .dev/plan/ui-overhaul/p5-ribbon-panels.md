# 分支实施计划:ui/p5-ribbon-panels — Ribbon 视觉细节 + 面板壳统一

> **版本**: v0.2(评审修订)
> **最后更新**: 2026-08-13
> **状态**: 已批准
> **分支**: `ui/p5-ribbon-panels`(基分支 `main`,合入前 rebase 到最新 main),预计 1d

---

## 1. 背景(接手前必读)

**项目**: Raven —— Word 类 docx 桌面编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix-ui + lucide)。编辑器核心为第三方 `@eigenpal/docx-editor-react`(别动)。

**为什么有这个任务**: 布局走查发现 Ribbon 与侧栏面板的视觉问题:

1. **双重分隔**: `RibbonGroup.tsx` 每个分组标签上方有 `border-t` 横线,组与组之间又有 `RibbonSeparator.tsx` 的竖向分隔线 —— 同一行出现两种分隔,视觉噪音。
2. **控件高度参差**: Ribbon 面板硬编码 `h-[88px]`,图标按钮 `h-12`(48px)与下拉控件(`FontCombobox`、字号/行距等 Select)`h-7`(28px)并排,垂直节奏混乱。
   - ⚠️ 评审修正: **横向滚动与面板高度无关** —— 高度(88→72-84、按钮 48→44)不改变任何宽度。Home 四组粗算约 1100px,1280px 窗口下可能本来就放得下,真实溢出场景是 ~1024px 笔记本。因此"高度收紧 → 无横向滚动"验收不成立,宽度需要**独立的收紧动作**(见任务 2b)与独立的验收(见 §5)。
3. **hover 动效跳脱**: `RibbonButton.tsx` / `RibbonToggleButton.tsx` 有 `hover:scale-105` / `active:scale-95`,在生产力工具栏上显得跳动(与 Word 静态反馈风格不符)。
4. **面板壳不统一**: `OutlinePanel`、`AgentSidebar`、`CommentPanel` 三个侧栏头部高度、字号、padding 各不同(分别为 text-xs 弱化 / text-sm 密集 / 自成一派)。

已批准方向:统一视觉细节。主计划:`.dev/plan/ui-overhaul.md` Phase 5(注意:蓝色 accent 由 `ui/p0-tokens` 负责,本分支不做颜色,只做结构/尺寸/动效)。

**并行情况**: 6 分支之一,协调见 `.dev/plan/ui-overhaul/00-overview.md`。与 `ui/p1` 共享 `Ribbon.tsx`;`agent-sidebar.tsx` 已由 `ui/p2` 独占(头部样式由 p2 按本分支 §4.4 规范执行);`comment-panel.tsx` 本分支独占 —— **本分支最后一个合入,基于最新 main 动热文件**。

## 2. 目标与范围

- Ribbon: 去双重分隔、统一控件高度基线、去掉缩放 hover、面板高度按内容收紧;**独立宽度收紧**(仅当 1024px 验收不达标时,见任务 2b)。
- 三个侧栏面板壳(头部)统一: 规范由本分支定义,`OutlinePanel`/`CommentPanel` 本分支执行,`AgentSidebar` 由 p2 按同一规范执行。
- 顶部标题行按钮(模板/主题/设置)样式统一。
- **只做结构/尺寸/动效,不做颜色**(颜色归 p0)。

## 3. 涉及文件(所有权)

| 文件 | 改动 |
| ------ | ------ |
| `src/features/ribbon/components/RibbonGroup.tsx` | 分隔方案:去掉分组标签上方 `border-t`(保留 `RibbonSeparator` 竖线),或反之 —— 截图对比后二选一 |
| `src/features/ribbon/components/RibbonButton.tsx` | 去 `hover:scale-105`/`active:scale-95`;高度 48px → 44px 基线;**宽度选项**(任务 2b 需要时): `min-w-[44px]`→`min-w-[40px]`、`px-2`→`px-1.5` |
| `src/features/ribbon/components/RibbonToggleButton.tsx` | 同上 |
| `src/features/ribbon/components/FormatPainter.tsx` | 去 `hover:scale-105`/`active:scale-95`(:78-79,评审补充) |
| `src/features/ribbon/components/ColorPicker.tsx` | 去 `hover:scale-110`(:80,评审补充) |
| `src/features/ribbon/components/Ribbon.tsx` | 面板高度 `h-[88px]` 按内容收紧(目标 ~72-84px);分组间距微调(与 `ui/p1` 共享此文件) |
| `src/features/ribbon/components/RibbonSeparator.tsx` | 视分隔方案微调高度;宽度选项:`mx-1`→`mx-0.5`(任务 2b) |
| `src/features/ribbon/components/FontCombobox.tsx` | 下拉控件 `h-7` 与图标按钮基线对齐;宽度选项:`w-[110px]`→`w-[96px]`(任务 2b) |
| `src/features/ribbon/components/tabs/HomeTab.tsx` + `LayoutTab.tsx` 的 Select | 下拉控件 `h-7` 与图标按钮基线对齐;宽度选项:字号 `w-[60px]`→`w-[52px]`、其余 `w-[64-80px]` 视情况收 4-8px(任务 2b) |
| `src/features/editor/components/OutlinePanel.tsx` | 头部统一(高 py-2、字号 12px、padding px-3) |
| `src/features/review/components/comment-panel.tsx` | **本分支独占**: 头部样式统一 + 手写 SVG 关闭按钮换 lucide `X`(吸收 p4 该文件的工作) |
| `src/pages/WorkspacePage.tsx` | 标题行按钮统一(模板按钮加图标,与主题/设置同款式;仅当 `ui/p1` 已合入时在其基础上改) |

## 4. 任务清单

1. **分隔方案**: 截图对比"组标签 border-t + 竖线"与"仅竖线"两版,定一版。默认建议:保留 `RibbonSeparator` 竖线、去掉 `RibbonGroup` 的 `border-t`(行内更干净)。
2. **高度基线(只影响垂直节奏,不影响宽度)**: 定义并落地 —— 图标按钮 44px 高、下拉控件 28px、分组内 `items-end` 对齐(现有已是 `items-end`);面板高度收紧到内部**纵向无空余**(目标 ~72-84px),高度验收见 §5。
2b. **宽度收紧(独立任务,仅当验收不达标时执行)**: 先实测当前 Home 在 1024px 窗口宽(典型笔记本,去掉左右侧栏后的 Ribbon 净宽)下是否出现横向滚动条。溢出则按序执行: `FontCombobox` `w-[110px]`→`w-[96px]` → 字号/行距等 Select 收 4-8px → `RibbonButton` `min-w-[44px]`→`min-w-[40px]`、`px-2`→`px-1.5` → `RibbonSeparator` `mx-1`→`mx-0.5`。每步后重测,收敛到 1024px 无滚动条即停(不做无意义的继续压缩)。
3. **去缩放动效**: `hover:scale-105`/`active:scale-95` 移除,保留 `hover:bg-accent` 底色反馈。范围含 `RibbonButton.tsx`、`RibbonToggleButton.tsx`、`FormatPainter.tsx`(:78-79)三处,以及 `ColorPicker.tsx` 的 `hover:scale-110`(:80)一并移除(评审补充)。
4. **面板壳规范(本分支定义,AgentSidebar 由 p2 执行)**: 统一三个侧栏头部 —— 高度 `py-2`、标题字号 12px、`px-3`、分割线 `border-b`;`OutlinePanel` 标题与 `AgentSidebar` 标题同款式。本分支执行 `OutlinePanel` + `CommentPanel`(顺手把 `CommentPanel` 头部的手写 SVG 关闭按钮换 lucide `X`),`AgentSidebar` 交给 p2 按同一规范执行(§3 注)。
5. **标题行**: `WorkspacePage` 里"模板"裸文本按钮加 lucide 图标,与主题/设置按钮同款尺寸;若 `ui/p1` 未合入,跳过此项并在合入说明注明,由 p1 之后补。

## 5. 测试与验证

```bash
bun run typecheck && bun run check && bun run test
```

受影响测试: Ribbon 相关测试若断言了高度/class 或截图结构,同步更新;`OutlinePanel` 测试同理。

验收:

- **垂直(高度)**: 面板高度按内容收紧到无纵向空余;Ribbon 无双重分隔;无缩放 hover;全项目无 `hover:scale-*`/`active:scale-*` 残留(grep 兜底)。
- **水平(宽度,独立验收)**: 1024px 窗口宽(典型笔记本)下 Home tab 无横向滚动条;若经任务 2b 全部选项后仍溢出,保留 `overflow-x-auto`(现状行为),在合入说明记录实测溢出阈值与已做的宽度动作,不以"1280px 放得下"充数。
- 三个侧栏头部高度/字号/padding 一致(并排截图对比)。
- 亮/暗截图各一张。

## 6. 合并与依赖(冲突说明)

- **本分支最后合入**。合入前 rebase 到最新 main(含 p0/p1/p2/p4)。
- `Ribbon.tsx`: p1 加了 FileTab 注册 —— 本分支改面板高度,区域不同,冲突极小。
- `comment-panel.tsx`: 本分支独占(p4 已移交该文件)。`agent-sidebar.tsx`: 已由 p2 独占,本分支**不触碰**。
- 若 p1 未合入导致 `WorkspacePage` 标题行任务无法执行,先跳过,记入合入说明。

## 7. 不做的事

- 不改颜色(p0 负责)、不重排按钮在分组内的顺序、不改快捷键/tooltip 文案。
- 不做 Ribbon 折叠分组/自适应分组(超出范围,后续需要单独立项)。
- 不压缩标题栏/状态栏(它们不在本分支范围)。
