# 实施清单(同事交接)

> 写给接手的同事:本文含完整来龙去脉 + 每个待办的必要信息(涉及文件、库 API、验收、风险)。
> 规划文档在 `.dev/plan/wps-benchmark/`,本文是其可执行摘要。

## 1. 来龙去脉(30 秒读完)

**目标**:Raven 功能全面对标 WPS(agent 是特色,保留)。

**已锁定的技术决策**:

- 编辑器底层:`@eigenpal/docx-editor-core` V1(Apache-2.0),**不迁移**到 superdoc V2(AGPL-3.0,已拒)。
- agent 文档后端:**OfficeCLI**(Apache-2.0,已核实 LICENSE),增补第二引擎(DocxReviewer 保留)。
- 许可证红线:**不引入任何 AGPL**。
- 已暂缓:剪贴板、导出 PDF、拼写/比较/翻译/保护加密、多视图(均用户拍板)。
- 已摘除:云同步/版本历史(后端未定,见 `.dev/archive/cloud-sync-history.md`)。

**已完成**:

- P0:样式库 / 目录 / 水印 / 分栏(4 分支已合入 main)。
- 架构债:`commands.ts` 已拆成 `src/features/editor/commands/`(10 文件)。
- OfficeCLI M1 spike:验范围完成(见 §2-A 引用的结果)。

## 2. 待实施清单(按优先级)

### A. OfficeCLI M2:agent 侧 officecli 接入【高,spec 已写】

**背景**:M1 spike 已验范围(结果:`officecli-spike-results.md`)。spike 结论:

- ✅ 安全走 officecli:公式(LaTeX→oMath)、域(22 类型)、脚注、表格、图片、书签/题注
- ❌ 排除:图表(chart)、mermaid 原生形状、OLE(库无对应节点,往返损坏)
- ⚠️ 图片:需 rels 规范化(spike 已验证修复后往返无损)

**实现 spec**:`officecli-m2-spec.md`(完整架构 + 文件清单 + 验收)。核心要点:

1. **架构**:officecli 由 **pi 扩展(Node)直接 spawn**(`node:child_process`),**不是 Rust Tauri 命令**(扩展在独立 pi 进程,无法调 Tauri 命令;它已有 `node:fs` + `RAVEN_DOCX_PATH`)。
2. **白名单语义工具**(7 个,不做通用透传):`insert_equation/field/footnote/table/picture` + `add_bookmark/caption/cross_reference`。
3. **rels 规范化**(后处理):officecli 写非标准 `Target="/media/..."`,需去前导斜杠改相对路径(否则图片丢失)。
4. 复用现有 busy 锁 + `documentDirty`→reload 链路;officecli 写后重建 DocxReviewer bridge(同 insert_paragraph 的 cache 失效逻辑)。

**涉及文件**:`src-tauri/resources/pi-extensions/raven-docx/`(新增 officecli.ts、改 index.ts)、`src-tauri/src/pi/mod.rs`(注入 `RAVEN_OFFICECLI_BIN` env)、`src-tauri/tauri.conf.json`(bundle 二进制)。

**officecli 二进制**:v1.0.144,mac-arm64 可下载:`curl -fsSL https://d.officecli.ai/officecli-mac-arm64`(当前在 `/tmp/officecli`)。

### B. P1:多级列表 + 分节符【高,纯接线,快】

**库命令**(均在 `@eigenpal/docx-editor-core/prosemirror/commands`,现已拆到 commands 目录):

- 列表:`increaseListLevel` / `decreaseListLevel` / `toggleNumberedList` / `toggleBulletList` / `removeList` / `getListInfo` / `isInList`
- 分节符:`insertSectionBreak` / `removeSectionBreak`

**现状**:现有列表用弱命令 `wrapIn`/`lift`(paragraph.ts),应替换为库的专用列表命令(支持多级)。

**涉及文件**:`src/features/editor/commands/paragraph.ts`、`document-structure.ts`;UI:`HomeTab.tsx`(列表按钮)、`LayoutTab.tsx`(分节符按钮)。

**验收**:多级列表可嵌套(缩进升级/降级),序列化 `w:numPr` 正确;分节符插入/删除,Word 打开正确。

### C. 表格命令补齐【中,架构债】

**现状**:库 32 个表格命令,Raven 只接了 11 个(table.ts)。

**未接的**(库命令名):`addColumnLeft`、`addColumnRight`、`addRowAbove`、`addRowBelow`、`deleteColumn`、`deleteRow`、`deleteTable`、`selectRow`、`selectColumn`、`selectTable`、`setCellMargins`、`setCellTextDirection`、`setAllTableBorders`、`setInsideTableBorders`、`setOutsideTableBorders`、`removeTableBorders`、`setTableBorderColor`、`setTableBorderWidth`、`autoFitContents`、`distributeColumns`、`toggleNoWrap`

**涉及文件**:`src/features/editor/commands/table.ts`(补包装);UI:`TableContextMenu.tsx` + 表格工具栏(已有 TableToolbar 系列可参考库组件)。

### D. 布局:Backstage 全屏 + 状态栏缩放【中,已决策】

- **Backstage 全屏**:文件标签从下拉改全屏面板(对标 WPS)。现状 `FileTab.tsx` 是下拉菜单。涉及 `FileTab.tsx`、`Ribbon.tsx`。
- **状态栏缩放成组**:`缩小 | 100% | 放大 | 最佳显示比例` 四控件成组。现状 `StatusBar.tsx` + `ZoomControl.tsx`。
- 顺带(按需):快速访问工具栏、功能区折叠、导航窗格增强。

### E. 分栏渲染验证【风险未闭环,重要】

**背景**:P0 分栏(commit `4c0598d`)只做了**序列化回写**(`finalSectionProperties` + `updateDocumentXml`),数据模型往返已 spike 验证无损。

**未验证**:编辑器渲染层是否按 `columnCount` **真正分栏渲染**(代码里没找到 column painter)。

**任务**:最小 demo —— 设 2 栏 → 看编辑区是否分两栏。

- 能渲染 → 闭环,更新 `p0-implementation.md` §4 去掉"未闭环"标注。
- 不能 → 走降级(保存时写分栏、Word 正确,编辑器近似),降级方案已写 `p0-implementation.md` §4。

### F. progress.md 更新【低,顺手】

根目录 `progress.md` 停在"Phase 4 Template / 272 tests"。实际:**668 个 `it()`**;且 P0 四项 + UI overhaul 均已合入。更新为当前状态(或重构为按功能模块的最新进度)。

## 3. 参考文档索引

| 文档 | 内容 |
| --- | --- |
| `.dev/plan/wps-benchmark.md` | 主规划(目标/架构三结论/决策/许可证) |
| `.dev/plan/wps-benchmark/capability-audit.md` | 能力盘点(库×OfficeCLI×WPS 边界地图) |
| `.dev/plan/wps-benchmark/p0-implementation.md` | P0 技术细节(已完成) |
| `.dev/plan/wps-benchmark/roadmap.md` | P1–P5 + 布局 + 架构债路线图 |
| `.dev/plan/wps-benchmark/officecli-integration.md` | OfficeCLI 接入总计划 |
| `.dev/plan/wps-benchmark/officecli-spike-results.md` | M1 spike 结果 + 验范围 |
| `.dev/plan/wps-benchmark/officecli-m2-spec.md` | M2 实现 spec(§2-A 的执行细则) |

## 4. 验证约定(每项完成后)

`bun run typecheck && bunx biome check && bun run test`(当前 668 个 it,必须全绿)。

提交:conventional commits,**subject 小写开头**,merge 用 `chore(merge):`。
