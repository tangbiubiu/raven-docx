# 分支实施计划:ui/p2-ruler — 标尺修复 + 死控件清理

> **版本**: v0.2(评审修订)
> **最后更新**: 2026-08-13
> **状态**: 已批准
> **分支**: `ui/p2-ruler`(基分支 `main`,合入前 rebase 到含 `ui/p1` 的 main),预计 1d

---

## 1. 背景(接手前必读)

**项目**: Raven —— Word 类 docx 桌面编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix-ui + lucide)。编辑器核心是第三方包 `@eigenpal/docx-editor-react`(自带标尺已被禁用,`EditorPane.tsx` 里 `showRuler={false}`),应用自己实现了一个 `Ruler` 组件。

**为什么有这个任务**: 布局走查发现标尺系统是坏的:

- 垂直标尺(`Ruler.tsx`)是 `absolute top-6 left-0`,贴在编辑区左缘;而 `DocxEditor` 的页面是**水平居中**的 → 窗口比页面宽时标尺悬在空白处,窗口窄时压在页面上。
- 水平标尺宽度=页面宽、左对齐,同样与居中页面错位。
- `ViewTab` 的「标尺」开关切换 `rulerVisible`,但 `WorkspacePage.tsx` **无条件渲染 `<Ruler />`** —— 开关是死控件,且 `rulerVisible` 默认 `false` 却一直显示。
- 另一个死控件: Ribbon「新建批注」调用 `setCommentPanelOpen(true)`,但 `commentPanelOpen` 全项目**无人读取** → 点了只开侧栏,不切到批注页(`AgentSidebar` 的聊天/批注切换是组件本地 state)。
- `useAppStore` 的 `AppModal` 联合类型里 `hyperlink/insertTable/insertImage/footnote` 四个成员从未被 store 使用(InsertTab 用本地 state 弹窗)—— 死分支。

已批准决策 **D2:标尺保留并修好**(对齐页面、开关生效、默认显示,与 Word 一致)。主计划:`.dev/plan/ui-overhaul.md` Phase 2。

**并行情况**: 6 分支之一,协调见 `.dev/plan/ui-overhaul/00-overview.md`。与 `ui/p1` 共享 `WorkspacePage.tsx`、`useAppStore.ts`;`agent-sidebar.tsx` **本分支独占**(吸收 p4/p5 的该文件工作,见任务 6),p4/p5 不再触碰。

## 2. 目标与范围

- 水平标尺与页面**居中对齐**;垂直标尺贴页面左缘、不覆盖内容;开关生效且默认显示。
- 「新建批注」直达批注页。
- 清理 `AppModal` 死分支。
- **不做滚动同步**(D2a,已批准): 垂直标尺只显示第 1 页。升级路径:需要时把标尺移入编辑器滚动容器并同步 scroll 事件。

## 3. 涉及文件(所有权)

| 文件 | 改动 |
| ------ | ------ |
| `src/features/editor/components/Ruler.tsx` | 对齐重构(主要工作量) |
| `src/pages/WorkspacePage.tsx` | Ruler 条件渲染(~3 行;与 `ui/p1` 共享,区域不相邻) |
| `src/stores/useAppStore.ts` | `rulerVisible` 默认 `true`;`AppModal` 删 4 个死成员;`commentPanelOpen` 注释改语义(与 `ui/p1` 共享,区域不同) |
| `src/features/agent/components/agent-sidebar.tsx` | **本分支独占**(吸收 p4 的图标替换与 p5 的头部样式,见任务 6): 订阅 `commentPanelOpen` 切 tab + SVG→lucide + 头部样式统一 |
| `src/features/ribbon/components/tabs/ViewTab.tsx` | **预计不用改**(按钮读/写 `rulerVisible` 已正确,缺的是消费方) |

## 4. 任务清单

1. **水平标尺对齐**: 在 `WorkspacePage` 中间列,把 Ruler 外层改为 `flex justify-center`,内层宽度 = 页面宽(`layout.pages[0].size.w * zoom/100`),标尺画在内层 —— 与 DocxEditor 居中页面天然对齐,无需测量。
   - **兜底方案(统一表述)**: 若实测发现库对页面还有额外内边距/偏移导致对不齐,用 `ResizeObserver` 监听编辑器容器,实测页面实际左偏移与**顶部纵向偏移**(见任务 2),标尺按该偏移量定位。验收以**视觉对齐**为准,不依赖"天然对齐"假设。
2. **垂直标尺**: 画在同一居中列内,`left-0` 贴页面左缘。
   - **放置硬规则(评审补充,替代开放式"截图验证")**: 实测页面左偏移(中栏左缘 → 页面左缘)≥ 24px(标尺宽 `w-6`)时,标尺画在页面左缘的空白区(即页面外、编辑器内容左侧);**不足 24px 时贴中栏左缘(与现有行为一致),若仍压到页面左边距(默认边距 96px 内是留白,视觉可接受)则维持现状即可,绝不画在页面文字区上**。不保留"画在页面边缘并与编辑器纵向分离"这种未定义选项。
   - **纵向位置方案(评审补充)**: 页面位于编辑器内部滚动容器中,其顶部相对标尺基线(`top-6`)的偏移未知(页面可能垂直居中、容器可能有 padding/已滚动)。规则: 垂直标尺的 `top` 以**第 1 页实际顶部**为准 —— 优先把水平/垂直标尺与页面置于同一居中流内(页面垂直居中则标尺同居中);无法同流定位时,由 ResizeObserver 兜底顺带测量纵向偏移(容器 padding/scrollTop)并应用。
   - **验收降级线**: 若库的纵向布局无法稳定测量(极端滚动/动态高度),验收明确降级为"左缘对齐 + 不压内容",纵向误差与原因写入合入说明,不阻塞合入。
   - 不做滚动同步(D2a): 滚动后垂直标尺停留在第 1 页位置,已知上限。
3. **开关接线**: `WorkspacePage` 从 store 读 `rulerVisible`,`{rulerVisible ? <Ruler /> : null}`;`useAppStore` 初始值改 `true`。
4. **批注入口**: `AgentSidebar` 用 `useEffect` 订阅 `commentPanelOpen`,为 `true` 时 `setActiveTab("comments")` 并 `setCommentPanelOpen(false)` 重置(触发一次)。`WorkspacePage` 的 `onNewComment` **不需要改**(它已经调用 `setCommentPanelOpen(true)`)。
5. **AppModal 清理**: 删 `hyperlink/insertTable/insertImage/footnote` 四成员,同步确认无 `openModal("hyperlink")` 等调用残留(grep)。
6. **agent-sidebar 三件套(吸收 p4/p5 的工作,使本文件单分支独占)**: ① SVG 图标换 lucide(清空 `Trash2`/关闭 `X`/错误 `AlertCircle`/重试 `RefreshCw`);② 头部样式按 p5 面板壳规范统一(高 `py-2`、字号 12px、`px-3`);③ 上述 activeTab 接线。一次做完,避免三个分支反复 rebase 同一文件。
7. **comment-panel.test.tsx 死代码清理**: `:57` 的 `useAppStore.setState({ commentPanelOpen: true })` 从未被读取(本分支改语义后更是如此),删除该行。

## 5. 测试与验证

```bash
bun run typecheck && bun run check && bun test
```

受影响测试:`Ruler.test.tsx`、`agent-sidebar` 相关测试、`useAppStore` 测试 —— 断言跟随实现更新。

验收:

- 任意窗口宽度(拉宽/拉窄/放大缩小)下标尺左右边距标记与页面边距对齐;垂直标尺不覆盖内容、**纵向位置对齐第 1 页实际顶部**(或按 §4.2 降级线验收)。
- 视图页「标尺」开关:开→显示,关→隐藏,默认显示。
- 选中文本点 Ribbon「新建批注」→ 侧栏自动切到批注页。
- 亮/暗截图各一张。

## 6. 合并与依赖(冲突说明)

- 与 `ui/p1` 共享 `WorkspacePage.tsx`、`useAppStore.ts`(区域不相邻,合并后手动保留两者);**合入前必须 rebase 到含 `ui/p1` 的 main**。
- `agent-sidebar.tsx` **本分支独占**(已吸收 p4/p5 的对应工作),p4/p5 不再触碰该文件,无三方冲突。

## 7. 不做的事

- 不启用 `DocxEditor` 自带标尺(样式不受控,且无垂直标尺)。
- 不做标尺滚动同步、不做标尺刻度/拖动缩进交互(超出本次范围)。
- 不重构 `AgentSidebar` 的 tab 机制(保持本地 state + 外部触发)。
