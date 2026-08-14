# 分支实施计划:ui/p0-tokens — 设计 Token(蓝色 accent + 字号刻度)

> **版本**: v0.1
> **最后更新**: 2026-08-13
> **状态**: 已批准
> **分支**: `ui/p0-tokens`(基分支 `main`),预计 0.5d

---

## 1. 背景(接手前必读)

**项目**: Raven —— Word 类 docx 桌面编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix-ui + lucide)。文档渲染/分页/保存由第三方包 `@eigenpal/docx-editor-react` 提供,通过 `useEditorBridge` 桥接。**不要碰编辑器集成。**

**为什么有这个任务**: 前端布局走查发现界面"乱",其中一个根因是**视觉扁平**——`src/index.css` 里所有设计 token(含 `primary`)的 oklch 色度都是 0,即纯灰阶:亮色下 primary 是近黑,暗色下是近白,导致按钮/选中态/链接几乎无法与普通文字区分,交互全靠 hover 猜。而设计稿 `.dev/proto/workspace.html` 明确指定了 Linear/Vercel 风格的蓝色 accent。已批准决策 **D1:引入蓝色 accent `oklch(0.58 0.18 255)`**。

**并行情况**: 本分支是 6 个并行分支之一,协调规则见 `.dev/plan/ui-overhaul/00-overview.md`。本分支**只改一个文件**,是所有分支的视觉基线,建议最先合入 main。

## 2. 目标与范围

- 在亮/暗两套主题里引入蓝色 primary 族,让交互元素(主按钮、选中态、焦点环、激活态)一眼可辨。
- 建立字号刻度规范,收敛全项目硬编码小字号。
- **不改任何布局、不改组件结构、不改其他 token**(accent/background/muted 等灰阶保留,chart 色保留)。

## 3. 涉及文件(本分支独占)

| 文件 | 改动 |
|------|------|
| `src/index.css` | 唯一改动文件 |

## 4. 任务清单

1. **亮色主题** `:root`:
   - `--primary: oklch(0.58 0.18 255)`(设计稿蓝);`--primary-foreground` 用白 `oklch(0.985 0 0)`(蓝底白字,对比度达标)。
   - `--ring` 同步为同族蓝(如 `oklch(0.55 0.18 255)`),焦点环可辨。
2. **暗色主题** `.dark`:
   - primary 用**亮蓝**(如 `oklch(0.72 0.15 255)`),`--primary-foreground` 用深色 `oklch(0.145 0 0)`,保证深底上的对比度。
   - `--ring` 同步亮蓝。
3. **校验对比度**: 主按钮文字(白字/深字)对比度 ≥ 4.5:1(可用浏览器 devtools 或对比度计算器)。
4. **字号刻度规范**: 在 `index.css` 顶部注释写入刻度表(正文 13-14px、面板头 12px、元信息 11px),并全局扫描 `text-[1-2][0-9]px` 硬编码用例。**只记录不修改其他分支的文件**——把需要收敛的用例(文件路径+行号)写进本分支合入说明,交给对应分支(p5 负责 Ribbon/面板头)。本分支自己**不得产生新的 `text-[10px]` 及以下用例**。

## 5. 测试与验证

- 逻辑零改动,`bun test` 冒烟即可(theme 相关测试不涉及颜色断言则无需改)。
- 验收: 亮/暗各截一张主界面图,主按钮/选中态/焦点环/链接为蓝,灰阶背景不变,对比度达标。

## 6. 合并与依赖

- 无依赖,建议**最先合入 main**,让其他分支走查时直接看到蓝色效果。
- 合入前:`git pull origin main --rebase`;`bun run typecheck` + `bun run check` + `bun test` 全绿。

## 7. 不做的事

- 不改 `--accent`(hover 底色保持灰,与 primary 职责分离)、不改 `--chart-*`、`--sidebar-*`。
- 不做全局样式重构,不引入 CSS 变量之外的新机制。
