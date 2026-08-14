# 实施清单(同事交接)

> 写给接手的同事:本文含完整来龙去脉 + 每个待办的必要信息(涉及文件、库 API、验收、风险)。
> 规划文档在 `.dev/plan/wps-benchmark/`,本文是其可执行摘要。上次同步:2026-08-14(15:44)。

## 0. 工作区状态(先读)

- **工作区干净**:此前未提交的 P1 + commands 拆分 + OfficeCLI M2/M3 已全部提交(`8bddb31`、`bbbf66f`,2026-08-14)。
- 测试基线:**719 个 it() / 71 文件**,typecheck + biome + test 全绿(改动前必须跑)。

## 1. 来龙去脉(30 秒读完)

**目标**:Raven 功能全面对标 WPS(agent 是特色,保留)。

**已锁定的技术决策**:

- 编辑器底层:`@eigenpal/docx-editor-core` V1(Apache-2.0),**不迁移**到 superdoc V2(AGPL-3.0,已拒)。
- agent 文档后端:**OfficeCLI**(Apache-2.0,已核实 LICENSE),增补第二引擎(DocxReviewer 保留)。
- 许可证红线:**不引入任何 AGPL**。
- 已暂缓:剪贴板、导出 PDF、拼写/比较/翻译/保护加密、多视图(均用户拍板)。
- 已摘除:云同步/版本历史(后端未定,见 `.dev/archive/cloud-sync-history.md`)。

**已完成**(截至 2026-08-14):

- P0:样式库 / 水印 / 分栏(渲染层按 `columnCount` 分栏已验证闭环)。
- P0 目录(TOC):⚠️ **部分**——`generateTOC` 按钮在编辑器往返回滚;**已决策走 OfficeCLI**(§2-A `insert_toc`)。
- P1:多级列表 + 分节符(✅ 已提交 `8bddb31`)。
- 架构债:`commands.ts` 已拆(✅ 已提交 `8bddb31`,barrel 带 biome-ignore 保留导入兼容)。
- OfficeCLI M1/M2/M3(✅ 已提交 `bbbf66f`):spike 验范围 + batch runner + rels 规范化 + 8 工具。
- progress.md 已更新为按模块进度。

## 2. 待实施清单(按优先级)

### A. OfficeCLI M2:agent 侧 officecli 接入【✅ 已完成 2026-08-14】

**实现要点回顾**(记录决策,避免后续重复调研):

1. **架构**:officecli 由 pi 扩展(Node)直接 spawn,不是 Rust Tauri 命令。**用 `batch` 单进程模式**(`spawnSync(bin, ["batch", doc, "--commands", json])`)——关键发现:普通 `add` 走 resident 异步落盘(2-10s),扩展直读会读到旧内容;`batch` 一次性 open→add→save、立即落盘、不留 resident。
2. **白名单语义工具 8 个**(无通用透传):`insert_equation/field/footnote/table/toc/add_bookmark/add_caption/cross_reference`。`insert_picture` 未接:需要前端受控图片上传通道(agent 无合法 src 来源),待后续。
3. **rels 规范化**:officecli 写非标准绝对 Target(`Target="/media/x.png"`、`/word/...`),jszip 后处理;注意根 `_rels/.rels` 保留 `word/` 前缀,仅 `word/_rels/*` 去 `/word/` 前缀。
4. **双引擎一致性**:officecli 写后重建 DocxReviewer + bridge(内存态过期,否则后续 DocxReviewer 工具写旧态覆盖);写前 `persistDoc()` 落盘 reviewer 内存态。
5. Rust:注入 `RAVEN_OFFICECLI_BIN`(仅二进制存在时);`MUTATION_TOOLS` 加入 8 个工具名(agent_end 时前端 reload)。
6. 二进制:`src-tauri/resources/officecli/officecli`(gitignored,v1.0.144,来源 `https://d.officecli.ai/officecli-mac-arm64`),dev 模式经 CARGO_MANIFEST_DIR 定位,生产经 resource 解析;tauri.conf.json resources 已加。

**待办(后续)**:insert_picture(前端图片通道)、M4 发布构建验证、officecli 升级走显式流程。

### B. 表格命令补齐【中,架构债】

**实施 spec**:`table-commands-spec.md`(含 21 个缺失命令清单 + 签名 + prosemirror-tables 不兼容修复)。

**现状**:库 32 个表格命令,Raven 只接了 10 个(table.ts)。**关键发现**:右键菜单 `useTableOperations.ts` 用了 prosemirror-tables(泛型,snake_case 节点名),与 docx-editor-core 的 tableRow/tableCell(camelCase)不兼容,大概率已失效,需迁移到库自己的命令。

**未接的**(库命令名):`addColumnLeft`、`addColumnRight`、`addRowAbove`、`addRowBelow`、`deleteColumn`、`deleteRow`、`deleteTable`、`selectRow`、`selectColumn`、`selectTable`、`setCellMargins`、`setCellTextDirection`、`setAllTableBorders`、`setInsideTableBorders`、`setOutsideTableBorders`、`removeTableBorders`、`setTableBorderColor`、`setTableBorderWidth`、`autoFitContents`、`distributeColumns`、`toggleNoWrap`

**涉及文件**:`src/features/editor/commands/table.ts`(补包装);UI:`TableContextMenu.tsx` + 表格工具栏(已有 TableToolbar 系列可参考库组件)。

### C. 布局:Backstage 全屏 + 状态栏缩放【中,已决策】

- **Backstage 全屏**:文件标签从下拉改全屏面板(对标 WPS)。现状 `FileTab.tsx` 是下拉菜单。涉及 `FileTab.tsx`、`Ribbon.tsx`。
- **状态栏缩放成组**:`缩小 | 100% | 放大 | 最佳显示比例` 四控件成组。现状 `StatusBar.tsx` + `ZoomControl.tsx`。
- 顺带(按需):快速访问工具栏、功能区折叠、导航窗格增强。

## 3. 参考文档索引

| 文档 | 内容 |
| --- | --- |
| `.dev/plan/wps-benchmark.md` | 主规划(目标/架构三结论/决策/许可证) |
| `.dev/plan/wps-benchmark/capability-audit.md` | 能力盘点(库×OfficeCLI×WPS 边界地图) |
| `.dev/plan/wps-benchmark/p0-implementation.md` | P0 技术细节(已完成;分栏风险已闭环) |
| `.dev/plan/wps-benchmark/roadmap.md` | P1–P5 + 布局 + 架构债路线图 |
| `.dev/plan/wps-benchmark/officecli-integration.md` | OfficeCLI 接入总计划(⚠️ §3 的 Rust 设计已被 m2-spec 取代,以 m2-spec 为准) |
| `.dev/plan/wps-benchmark/officecli-spike-results.md` | M1 spike 结果 + 验范围 |
| `.dev/plan/wps-benchmark/officecli-m2-spec.md` | M2 实现 spec(§2-A 的执行细则) |

## 4. 验证约定(每项完成后)

`bun run typecheck && bunx biome check && bun run test`(当前 711 个 it() / 70 文件,必须全绿)。

提交:conventional commits,**subject 小写开头**,merge 用 `chore(merge):`。
