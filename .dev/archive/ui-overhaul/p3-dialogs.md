# 分支实施计划:ui/p3-dialogs — 弹窗统一到 radix Dialog

> **版本**: v0.2(评审修订)
> **最后更新**: 2026-08-13
> **状态**: 已批准
> **分支**: `ui/p3-dialogs`(基分支 `main`),预计 1d
> **本分支无共享文件,不依赖其他分支,可随时合入**

---

## 1. 背景(接手前必读)

**项目**: Raven —— Word 类 docx 桌面编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix-ui + lucide)。项目已有 radix 封装的通用弹窗组件 `src/components/ui/dialog.tsx`(以及 `sheet.tsx`/`popover.tsx` 等),但**没被所有弹窗使用**。

**为什么有这个任务**: 布局走查发现全项目有 **5 种互不相同的弹窗实现**,遮罩透明度、内边距、圆角、关闭方式(Escape)全不一致,而且 `InsertTab.tsx`、`ReviewTab.tsx`、`ReferencesTab.tsx` 里的裸 modal **硬编码 `bg-white`** → 暗色模式下是白块,与全局 `bg-background` 主题系统脱节。已批准方向:统一到现有 radix Dialog。主计划:`.dev/plan/ui-overhaul.md` Phase 3。

**现状清单(5 种实现,统一枚举)**:

1. **store 驱动的 modal**(`activeModal`): `PageSetupDialog` / `HeaderFooterEditor` / `CommandPalette` / `FindReplaceDialog` / `VariableForm` —— 已是 Dialog 风格,保留。
2. **tab 内裸 modal**: `InsertTab.tsx` 3 个(表格网格/超链接/脚注)+ `ReviewTab.tsx` 字数统计 + `ReferencesTab.tsx` —— `fixed inset-0` + `bg-white`,**本次改造对象**。
3. **SettingsDrawer 自绘遮罩 + 抽屉**: 右滑,评估是否换 `sheet.tsx`。
4. **Ribbon 窄屏浮层**(`Ribbon.tsx` 内): 移动端浮层,不在本次范围。
5. **PanelPopover**(侧栏折叠浮窗): 不在本次范围。

**并行情况**: 6 分支之一,协调见 `.dev/plan/ui-overhaul/00-overview.md`。本分支文件全部独享,与其他分支零冲突。

## 2. 目标与范围

- 把 tab 内裸 modal 全部换成 `components/ui/dialog.tsx`,`bg-white` → 主题 token。
- 统一全项目弹层遮罩/圆角/内边距基线。
- **不改弹窗内部业务逻辑**(表格网格选择、超链接表单等组件本身不动,只换外壳)。

## 3. 涉及文件(所有权,全部独享)

| 文件 | 改动 |
| ------ | ------ |
| `src/features/ribbon/components/tabs/InsertTab.tsx` | 3 个裸 modal → Dialog |
| `src/features/ribbon/components/tabs/ReviewTab.tsx` | 字数统计 modal → Dialog |
| `src/features/ribbon/components/tabs/ReferencesTab.tsx` | modal → Dialog |
| `src/features/settings/components/SettingsDrawer.tsx` | 评估换 `sheet.tsx`;不换则统一遮罩 |
| (全项目扫描) | 统一 `fixed inset-0` 弹层基线 |

## 4. 任务清单

1. 通读 `src/components/ui/dialog.tsx` 的 props 约定(radix Dialog + shadcn 样式,含 `DialogContent`/`DialogHeader`/`DialogFooter`/`DialogTitle` 等),按现有用法(参考 PageSetupDialog)接入。
2. `InsertTab`: 3 个 modal 换 Dialog,`bg-white p-4` → `DialogContent`(主题背景自动正确);弹窗打开状态(`showTableGrid` 等)保持不变,`onOpenChange` 接关闭。
3. `ReviewTab` / `ReferencesTab`: 同样处理。
4. `SettingsDrawer`: 尝试换 `sheet.tsx`(右滑抽屉,语义最贴合);若发现行为差异过大(如嵌套滚动/动画),**回退到自绘**,只把遮罩统一为 `bg-black/50` 并在合入说明里注明理由。
5. 全项目 grep `fixed inset-0`,把非 Dialog 的纯弹层列出来,能并则并;`Ribbon.tsx` 窄屏浮层与 `PanelPopover` 明确排除(浮层语义)。
6. 检查这些 tab 的测试(`insert-table-grid`、`hyperlink-dialog`、`footnote-dialog` 等):若断言了 `bg-white` 或旧结构,同步更新。

## 5. 测试与验证

```bash
bun run typecheck && bunx biome check && bun run test
```

验收:

- 暗色模式下所有弹窗无白块,背景为 `bg-background` 体系。
- 所有弹窗 Escape 可关;打开/关闭动画与现有 Dialog 一致。
- 表格网格/超链接/脚注/字数统计功能回归正常(手动点一遍)。
- 亮/暗截图各一张。

## 6. 合并与依赖

- 无依赖、无共享文件。合入前 `git pull origin main --rebase` + 三件套全绿即可。
- 建议放最后合入(减少并发冲突窗口),也可随时合入。

## 7. 不做的事

- 不改 `activeModal` 驱动的弹窗(已统一)。
- 不改 Ribbon 窄屏浮层、`PanelPopover`、`MenuBar` 遗留(菜单栏由 `ui/p1` 处理,注意 p3 合入时 p1 可能已删菜单栏,别把 `menu-bar` 相关文件列进改动)。
- 不加新依赖(radix 已安装)。
