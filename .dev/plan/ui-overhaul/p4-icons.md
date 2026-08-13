# 分支实施计划:ui/p4-icons — 图标统一到 lucide

> **版本**: v0.2(评审修订)
> **最后更新**: 2026-08-13
> **状态**: 已批准
> **分支**: `ui/p4-icons`(基分支 `main`,合入前 rebase 到含 `ui/p2` 的 main),预计 0.5d

---

## 1. 背景(接手前必读)

**项目**: Raven —— Word 类 docx 桌面编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix-ui + lucide)。全项目图标体系以 lucide-react 为主(Ribbon、菜单、面板),但存在三处不一致:

| 位置 | 现状 | 问题 |
| ------ | ------ | ------ |
| `src/features/theme/components/theme-toggle.tsx` | 用 emoji 🌙/☀️ | 与其他 lucide 按钮风格割裂,且 emoji 渲染随系统字体/平台变化,明暗模式切换时闪烁 |
| `src/features/agent/components/quick-actions.tsx` | 8 个 emoji(✏️✨📋📝🌐🔍👔💡),`icon` 字段是 `string` | 同上;且 `QUICK_ACTIONS` 是字符串 → 组件,类型上就该是组件 |
| `src/features/agent/components/command-palette.tsx` | 部分命令用 emoji(✨📝 等) | 同上 |
| `agent-sidebar.tsx` / `comment-panel.tsx` 的手写 SVG | 由 **ui/p2**(agent-sidebar)与 **ui/p5**(comment-panel)承接 | 本分支不碰这两个文件,避免热文件三方冲突 |

已批准方向:全项目统一 lucide。主计划:`.dev/plan/ui-overhaul.md` Phase 4。

**并行情况**: 6 分支之一,协调见 `.dev/plan/ui-overhaul/00-overview.md`。**本分支无共享文件**(agent-sidebar 的手写 SVG 由 p2 承接,comment-panel 由 p5 承接),可随时合入。

## 2. 目标与范围

- emoji / 手写 SVG 全部替换为 lucide 组件。
- 只换图标,不换文案、布局、快捷键、行为。

## 3. 涉及文件(所有权)

| 文件 | 改动 |
| ------ | ------ |
| `src/features/theme/components/theme-toggle.tsx` | 🌙/☀️ → lucide `Sun` / `Moon` |
| `src/features/agent/components/quick-actions.tsx` | 8 emoji → lucide;`icon: string` → `icon: LucideIcon`,渲染 `<action.icon />` |
| `src/features/agent/components/command-palette.tsx` | 命令 emoji → lucide |

> 注: `agent-sidebar.tsx`(手写 SVG)由 **ui/p2** 承接,`comment-panel.tsx`(手写 SVG)由 **ui/p5** 承接 —— 本分支不碰这两个文件。

## 4. 任务清单

1. **quick-actions.tsx**: `QUICK_ACTIONS` 的 `icon` 字段改为 `LucideIcon`,8 个条目换成 lucide 图标(建议:续写 `PenLine`/`Feather`、润色 `Sparkles`、摘要 `ClipboardList`、扩写 `Expand`、翻译 `Languages`、风格检查 `SearchCheck`、转正式 `Briefcase`、解释 `Lightbulb`);渲染处 `<span className="text-sm">{action.icon}</span>` → `<action.icon className="size-4" />`。**快捷键角标(⌘J/⌘K/⌘⇧S)保留**。
2. **command-palette.tsx**: 找到 emoji 图标字段,同样换 LucideIcon。
3. **theme-toggle.tsx**: `{isDark ? "☀️" : "🌙"}` → `<Sun />` / `<Moon />`(注意: 图标意义与切换方向相反是既有约定——亮色时点出月亮——保持原逻辑:`isDark ? Sun : Moon`),沿用现有 `size-4` 等 class 约定。
4. **agent-sidebar.tsx / comment-panel.tsx**: 不在本分支范围 —— 分别由 p2 / p5 承接(见 §3 注)。收尾 grep 清零(见验收)验证**全项目**无 emoji/手写 SVG,若 p2/p5 尚未合入导致 grep 仍命中,在合入说明里注明归属,不阻塞。

## 5. 测试与验证

```bash
bun run typecheck && bun run check && bun run test
```

受影响测试:`quick-actions` 测试若断言 emoji 文案则更新(lucide 图标渲染为 `<svg>`,一般不影响 `getByText` 对 label 的断言);`command-palette` 测试同理。

验收(grep 清零):

- 无 `🌙|☀️|✏️|✨|📋|📝|🌐|🔍|👔|💡` 残留(含 command-palette)。
- `src/features` 下无手写 `<svg`(lucide 内部不算;`biome-ignore` 检查一遍)。
- 侧栏/主题/快捷操作按钮点击行为无回归。

## 6. 合并与依赖

- **无共享文件、无依赖**,合入前 `git pull origin main --rebase` + 三件套全绿即可,任意时间合入。
- 若 p2/p5 未合入,grep 清零验收中的 `agent-sidebar.tsx`/`comment-panel.tsx` 命中项在合入说明中注明归属。

## 7. 不做的事

- 不换 Ribbon/菜单里已正确的 lucide 图标。
- 不调整图标尺寸体系(统一用 `size-4`/`size-5` 现有约定,不改布局)。
- 不新增图标库。
