# 分支实施计划:ui/p1-word-layout — 顶部按 MS Word 布局(删菜单栏,文件进 Ribbon)

> **版本**: v0.2(评审修订)
> **最后更新**: 2026-08-13
> **状态**: 已批准
> **分支**: `ui/p1-word-layout`(基分支 `main`),预计 1-2d
> **⚠️ 本分支是 6 个分支中唯一动架构的,合入后需人工评审**

---

## 1. 背景(接手前必读)

**项目**: Raven —— Word 类 docx 桌面编辑器(Tauri 2 + React 19 + Tailwind v4 + zustand + radix-ui + lucide)。编辑器核心是第三方包 `@eigenpal/docx-editor-react`,经 `useEditorBridge` 桥接。**不要碰编辑器集成、命令层、store 语义。**

**为什么有这个任务**: 布局走查发现顶部堆了 4 行 chrome(标题栏 + 菜单栏 + Ribbon 标签栏 + 88px 面板)约 170px,内容区被挤压。已批准决策 **D3:顶部尽可能按 MS Word 布局** —— Word 没有独立菜单栏,文件/编辑等操作都在 Ribbon 里。对照现状:`文件`(新建/打开/保存/另存为)在独立菜单栏;其余菜单项中**多数**在 Ribbon 各 tab 已有等价按钮,另有 **7 个死菜单项**(点击无动作,见 §4.6)删除即清理,无功能损失。

**并行情况**: 6 分支之一,协调见 `.dev/plan/ui-overhaul/00-overview.md`。热文件 `WorkspacePage.tsx` 与 `Ribbon.tsx` 分别与 `ui/p2-ruler`、`ui/p5-ribbon-panels` 共享,冲突处理见 §6。

**主计划**: `.dev/plan/ui-overhaul.md` Phase 1(含 D3a/D3b 默认决策)。

## 2. 目标与范围

- 删除菜单栏整行(约省 36px 垂直空间)。
- 新增 Ribbon 最左侧「文件」tab:下拉浮层,提供 新建/打开/保存/另存为。
- **任何现有功能不得因此丢失**(死菜单项除外,它们本来就没有动作)。

**D3a 默认(已批准)**: 文件 tab 用下拉浮层(仿原 MenuDropdown),不做 Word 全屏 Backstage。**D3b 默认(已批准)**: 菜单栏其余菜单项已在 Ribbon 有等价物,直接删除不搬运。

## 3. 涉及文件(所有权)

| 文件 | 改动 |
| ------ | ------ |
| `src/stores/useAppStore.ts` | `RibbonTab` 联合类型加 `"file"`(注意与 `ui/p2-ruler` 共享此文件,冲突区域不同) |
| `src/features/ribbon/ribbon-config.ts` | `RIBBON_TABS` 首位加 `{ id: "file", labelKey: "ribbon.tab.file" }` |
| `src/lib/i18n/en.ts` + `zh-CN.ts` | 新增 `"ribbon.tab.file": "File" / "文件"`(**必须成对**) |
| `src/features/ribbon/components/Ribbon.tsx` | `TAB_COMPONENTS` 注册 FileTab + import(与 `ui/p5` 共享此文件) |
| `src/features/ribbon/components/tabs/FileTab.tsx` | **新建**:文件下拉浮层 |
| `src/features/menubar/menu-config.ts` | 文件分组先被 FileTab 复用,核对后删除整个文件 |
| `src/features/menubar/components/menu-bar.tsx` | **删除**(含 MenuDropdown 组件,逻辑迁入 FileTab) |
| `src/pages/WorkspacePage.tsx` | 删 `<MenuBar>` 行、import、`menuCallbacks` 裁剪(与 `ui/p2` 共享) |
| `src/features/menubar/components/__tests__/menu-bar.test.tsx` | 删除,另在 FileTab 补冒烟测试 |

## 4. 任务清单

1. **类型与配置**: `RibbonTab` 加 `"file"`;`RIBBON_TABS` 首位插入;TAB_COMPONENTS 加 `LazyFileTab`(懒加载,与现有模式一致)。
2. **i18n**: 双语键(见 §3),缺失视为合入阻断。
3. **FileTab.tsx**: 渲染下拉浮层(新建/打开/保存/另存为),数据源直接复用 `menu-config.ts` 的 file 分组(先引后删);点击外部/Escape 关闭(逻辑从原 MenuBar 迁入);四个动作走 `onNew/onOpen/onSave` 回调(WorkspacePage 已提供)。
   - 注: `menu.file.close` 是死菜单项(**不搬运**);`{ separator: true }`(`menu-config.ts:34`,位于 saveAs 与 close 之间)是 close 的分隔线,close 删除后**一并删掉**,避免孤立分隔线;`menu.file.*` 等 i18n 键由 FileTab 继续复用,键保留不删。
   - 注: **另存为 = 保存别名(现状保留)** —— `menu-bar.tsx:142-143` 中 `file:saveAs` 与 `file:save` 都调用 `onSave()`,今天就没有真正的另存为。FileTab 继承同一行为,**不要**实现真另存为(见验收)。
4. **类型迁移(修正描述)**: `RibbonCallbacks` 是独立定义(**没有实际 extends**,`Ribbon.tsx:21` 的"扩展 MenuBarCallbacks"注释是过期的)。真实依赖在 `WorkspacePage.tsx:21` 的 `import type { MenuBarCallbacks }` 与 `:157` 的 `const menuCallbacks: MenuBarCallbacks` 标注 —— 删 menubar 目录后此 import 直接断。做法: 把 `WorkspacePage` 的 `menuCallbacks` 类型标注改为 `RibbonCallbacks`(`:157`),删除 `menu-bar.tsx` 里的 `MenuBarCallbacks` 定义,顺手清理 `Ribbon.tsx:21` 的过期注释。删除 menubar feature 目录后 grep 验证无残留引用。
5. **WorkspacePage**: 删 `<MenuBar {...menuCallbacks} />` 与 import;`menuCallbacks` 保留(仍是 `ribbonCallbacks` 的基,FileTab 需要 onNew/onOpen/onSave)。
6. **功能核对清单(合入门)**: 逐项确认下列菜单项在 Ribbon 有等价操作,全部确认后才允许删除 menu-config 的非文件分组:
   - 编辑: 撤销/重做 ✓ Home;查找/替换 ✓ Home(搜索按钮)+ ⌘F
   - 插入: 表格/图片/链接 ✓ Insert tab
   - 格式: 粗体/斜体/下划线/删除线 ✓ Home;清除格式 ✓ Home(Eraser)
   - 页面布局: 页面设置/页眉页脚 ✓ Layout tab
   - 视图: 大纲/缩放 ✓ View tab
   - Agent: 开关 ✓ View tab(⌘⇧A)
   - **死菜单项核对(修正陈述)**: `file:close`、`edit:cut`、`edit:copy`、`edit:paste`、`edit:find`、`format:clear`、`help:about` 共 7 项在 `menu-bar.tsx` 的 handleAction switch 中**没有对应 case,点击无动作**。其中 cut/copy/paste 由编辑器 contenteditable 原生支持(⌘X/⌘C/⌘V 在文档内照常工作),`edit:find`/`format:clear` 的快捷键与功能由全局 hooks 与 HomeTab 提供。**删除即清理,不作为"Ribbon 有等价物"勾选**,逐项勾掉确认后删除。
   - 快捷键: ⌘N/⌘O/⌘S/⌘P/⌘F/⌘K 全部走全局 hooks,**不受菜单栏删除影响**,逐键验证
7. **测试**: 删除 menu-bar 测试;新增 FileTab 冒烟测试(渲染 4 个文件动作、点击触发回调);`Ribbon.test.tsx` 若断言标签列表需同步更新(多一个 file tab)。

## 5. 测试与验证

```bash
bun run typecheck && bunx biome check && bun run test
```

验收:

- 顶部少一行;「文件」在标签栏最左,展开浮层可完成新建/打开/保存;另存为与保存行为一致(现状别名,不实现真另存为)。
- 核对清单(§4.6)全勾;快捷键全通。
- 亮/暗截图各一张。

## 6. 合并与依赖(冲突说明)

- 与 `ui/p2-ruler` 共享 `WorkspacePage.tsx`(p2 改 Ruler 条件渲染,区域不相邻);**p2 合入前 rebase 到含本分支的 main**。
- 与 `ui/p5-ribbon-panels` 共享 `Ribbon.tsx`(p5 改面板高度,区域不同)。
- 建议第二个合入 main(仅次于 `ui/p0-tokens`),合入后通知 p2/p5 各分支 rebase。
- 合入前:`git pull origin main --rebase` 且三件套全绿;本分支结构性改动,合入后协调人做一次人工评审。

## 7. 不做的事

- 不做全屏 Backstage(D3a);不做 QAT 快捷工具栏;不搬移菜单项到其他位置;不改快捷键绑定逻辑。
