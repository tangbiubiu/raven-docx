# Progress

> 更新:2026-08-14。测试基线 668 it() / 68 文件(typecheck + biome + test 全绿)。

## 按功能模块

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 样式库(下拉) | ✅ P0 | 文档驱动(doc styles.xml,非硬编码);下拉回显当前样式;应用/清除/取样式命令 + 分页符 |
| 目录(TOC) | ⚠️ 部分 | 按钮已接线(generateTOC);实测 WPS 数字样式文档缺 TOCHeading/TOC1 样式,插入被编辑器往返回滚。**已决策:走 OfficeCLI** |
| 水印 | ✅ P0 | 对话框 + 命令;实测 OOXML 含 `v:textpath`,重开预填回路正确 |
| 分栏 | ✅ P0 | 序列化回写(`finalSectionProperties` + `updateDocumentXml`)+ 分节符;实测渲染层按 `columnCount` 分栏(layout-engine paginator) |
| 模板变量 | ✅ Phase 4 | useTemplateVars + VariableForm + WorkspacePage 集成 |
| 换皮(UI overhaul) | ✅ | ribbon 面板化(平铺/两端对齐/视觉打磨)、ruler 对齐、pi 与本地 ~/.pi 隔离 |
| 文档打开/保存 | ✅ | Tauri bridge 打开/保存/另存为;重载链路(agent 回环) |

## 已知问题(实测发现)

- **空文档态命令静默 no-op**:未打开文档时 `getEditorView()` 返回 null,全部 `exec*` 命令不生效且无提示。真实文档打开后正常。→ 待补:空态提示或命令降级。
- **TOC 在缺 TOCHeading/TOC1 样式的文档上不持久**(见上),走 OfficeCLI 方案。

## 计划/文档线(.dev/plan/wps-benchmark/)

- P0 实施计划:`p0-implementation.md`(样式/目录/水印/分栏,已合入)
- OfficeCLI 接入计划:`officecli-integration.md`(第二编辑引擎,Apache-2.0;待实施:保真 spike → `officecli_exec` 命令 → agent 语义工具 → sidecar 打包)
- 云同步/历史:文件级快照 + 每次保存版本(已记入文档,未实施)
- 能力边界:capability-audit.md(核心库 × OfficeCLI × WPS)

## 待办

- [ ] TOC 走 OfficeCLI(M1 spike 先行,验证往返保真)
- [ ] 空文档态命令提示/降级
- [ ] 分栏:更多分栏对话框(栏宽/间距/分隔线)细化验收
