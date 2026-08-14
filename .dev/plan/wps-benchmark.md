# 对标 WPS + 引入 OfficeCLI —— 规划文档

> 状态:决策已定 → 待调查盘点 → 待实施
> 关联:.dev/archive/ui-overhaul/(已完成的换皮)、.dev/requirements/(原始需求)

## 1. 背景与目标

用户要求 Raven 功能**全面对标 WPS**(agent 是 Raven 特色,保留)。对标拆成三方面:**架构 / 功能 / 布局**。同时在调研是否引入 [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) 作为 agent 的文档操作后端。

本文档汇总已完成的全景调研结论、之后的行动顺序、以及需要用户拍板的决策点。

## 2. 现状(已确认的事实)

### 2.1 Raven 当前功能清单(7 个标签)

| 标签 | 内容 |
| --- | --- |
| 文件 | 新建/打开/保存/另存为(下拉,非全屏) |
| 开始 | 撤销重做;字体(加粗斜体下划线删除线上标下标字体字号颜色高亮格式刷);段落(左中右两端对齐/有序无序/增缩进减缩进);样式(仅"正文");编辑(清除格式/查找) |
| 插入 | 表格/图片/链接/脚注/分页符 |
| 布局 | 页面设置/页眉页脚/行距/段前段后/缩进/缩进值 |
| 引用 | 脚注/目录 |
| 审阅 | 评论/字数统计/修订模式/接受拒绝上下/接受全部拒绝全部 |
| 视图 | 大纲/标尺/缩放/打印预览/打印/Agent 面板 |

### 2.2 底层库能力(关键发现)

`@eigenpal/docx-editor-core` v1.3.2 已内置、但 Raven **未接线**的能力:

- **节点**:math(公式)、shape(形状)、textBox(文本框)、field(域)、footnoteRef(脚注引用)、sdt/blockSdt(内容控件/表单)、horizontalRule、tab
- **命令**:`generateTOC`(目录)、`applyStyle/clearStyle/getStyleId`(样式库)、`setWatermark`(水印)、`addTabStop/removeTabStop`(制表位)、完整表格命令(20+,只接了~10)、`toggleBulletList/increaseListLevel/setLtr/setRtl/setUnderlineStyle`
- **headless API**:`parseDocx/serializeDocx`、`getParagraphs/getBodyText/countWords`、内容控件查询、`DocumentAgent`
- **React 自带 UI**:`HorizontalRuler`、`ColorPicker`、`FontPicker`、`InsertSymbolDialog`、`PageSetupDialog`、`FindReplaceDialog`、`HyperlinkDialog`、`InsertTableDialog`、`PrintPreview` 等(Raven 重复实现了其中一部分)
- **桥接空桩**:`createEditorBridge` 里 `applyFormatting: () => false`、`setParagraphStyle: () => false`

**库明确没有的**(需自研或另想办法):拼写检查、比较文档、导出 PDF、翻译/同义词。

### 2.3 agent 现有架构(文件回环,已测试)

```
useAgentSession 存临时文件(RAVEN_DOCX_PATH)
  → pi spawn 拿到 env(--exclude-tools bash,安全边界)
  → raven-docx 扩展用 DocxReviewer 编辑文档
  → persistDoc 写回临时文件
  → agent_end(documentDirty) → reloadDocument → reloadFromTemp → 落盘原文件
```

**结论:agent 编辑"另一份副本 + 回写 + UI 重载"的同步基础设施已存在且有回归测试。**

### 2.4 WPS 对标差距

- 标签:WPS 11 个(文件/其他命令/开始/插入/页面/引用/审阅/视图/工具/会员专享/WPS AI)vs Raven 7 个。
- 功能差距按优先级见 §3.2。
- 布局差距见 §3.3。

## 3. 三个方面的结论

### 3.1 架构:不推倒,补"接线层"

**分层正确**(Zustand store → 纯函数命令层 → feature 目录 → 第三方内核),不重写、不换框架。要动的:

| 优先级 | 动作 |
| --- | --- |
| P0 | 补桥接契约:对齐 `EditorBridge` 与库真实 API,接上 `applyFormatting`/`setParagraphStyle` 空桩 |
| P0 | 建**能力盘点表**(库 vs OfficeCLI vs WPS),作为后续所有实施的地图 |
| P1 | `commands.ts` 按域拆分(已 500 行 god-file,中间夹 import)→ `commands/(formatting/paragraph/table/image/review/document-structure/styles).ts` |
| P2 | 数据访问统一走 headless API(`getParagraphs/countWords`),减少对 PM 内部结构耦合;导出 PDF = `serializeDocx` + Tauri 端渲染 |
| P3 | 重复 UI 取舍:保留 Raven 自绘组件(样式统一),复用库对话框逻辑或作 fallback;不再新造库已提供的纯逻辑 |

### 3.2 功能:能力盘点表驱动(待产出)

按优先级(WPS 有、Raven 无):

- **P0 基本闭环**:剪贴板组(复制/剪切/粘贴)、导出 PDF、样式库(标题 1–9)
- **P1 文档结构**:自动目录、分栏/分隔符、水印/页面背景、题注/书签/交叉引用、页码、多级列表

> 已决策的首批实施范围(P0):**样式库 + 目录 + 水印 + 分栏**。剪贴板组、导出 PDF 暂缓。

- **P2 插入丰富度**:形状/图表/公式/文本框/符号/日期、封面页
- **P3 审阅专业度**:拼写检查、翻译、比较文档、保护文档
- **P4 视图体验**:多视图/阅读模式、网格线、拆分窗口、全屏/护眼、单双页
- **P5 平台**:崩溃恢复、云同步、加密、导出多格式

> 大部分 P0–P2 项**库已支持**(generateTOC/applyStyle/setWatermark/field/math/shape/textBox 等),是"接线 + UI"工作量;P3–P5 里有几项(拼写/比较/导出 PDF/翻译)库没有,需另立方案。

### 3.3 布局:值得学的 5 点

1. 快速访问工具栏(左上常驻 新建/打开/保存 + 自定义下拉)
2. 功能区折叠(双击标签收起 ribbon)
3. Backstage 全屏文件面板(已决策:改全屏)
4. 状态栏缩放成组(`缩小 | 100% | 放大 | 最佳显示比例`)
5. 导航窗格(标题树,Raven 大纲面板已接近,可对标增强)

## 4. OfficeCLI 评估

[OfficeCLI](https://github.com/iOfficeAI/OfficeCLI):单二进制、Apache 2.0、无依赖,给 AI agent 用命令行操作 Word/Excel/PPT。Word 覆盖:段落/运行/表格/样式/文本框/形状/页眉页脚/图片/**LaTeX 公式**/**mermaid 图**/**图表**/评论/脚注/水印/书签/目录/节/表单/内容控件/**22 种域**/**OLE**/修订。自带 **HTML/PNG 渲染**(给 agent "眼睛",render→look→fix 自纠)。

### 4.1 关键判断

**不是"新增双源真值",是"替换 agent 编辑后端"。** 现有 agent 后端 = DocxReviewer(docx-editor-core);换成 OfficeCLI 后,§2.3 的同步链路(临时文件 + reload)原样保留,只换中间的编辑引擎。

| 维度 | DocxReviewer(现状) | OfficeCLI(提案) |
| --- | --- | --- |
| Word 覆盖 | 受限于库 reviewer API | 全面(含公式/图/图表/OLE/域/表单) |
| 往返保真 | 零损耗(同实现) | ⚠️ 独立实现,需实测 |
| agent 视觉 | 无(盲改) | HTML/PNG 渲染 |
| 未来扩展 | 仅 Word | 顺带 Excel/PPT |
| 依赖 | 无 | 二进制 sidecar |

### 4.2 两个条件

1. **不让 pi 直接 bash 调 OfficeCLI**(`--exclude-tools bash` 是安全边界)。应包一个 Rust Tauri 命令 `officecli_exec`:flush 编辑器 buffer → 无 shell 跑二进制 → 读回 → reload → 返回 diff/摘要,作为 agent 的一个工具暴露。
2. **先做"往返保真"spike**:真实文档(含图片/表格/修订)走 docx-editor-core 序列化 → OfficeCLI 编辑 → 重解析,确认无丢失。

### 4.3 决策依据(一句话)

OfficeCLI 相对现有 DocxReviewer **唯一不可替代价值** = LaTeX 公式、mermaid 图、图表、OLE、以及未来的 Excel/PPT。**这几项不是刚需 → 留在 docx-editor-core 扩工具集(零风险);是刚需 → 走 OfficeCLI(先 spike)。**

### 4.4 许可证约束(硬约束)

- **不引入 AGPL**。评估过 [superdoc/docx-editor](https://github.com/superdoc/docx-editor)(= docx-editor-core 的继任者,V2 为 OOXML 原生重写,自带 SDK/MCP/CLI),其许可证为 **AGPL-3.0** → **放弃引入,仅参考其 OOXML-native 设计思路**(如分栏/节/页眉页脚的原生处理),自行在 V1 上实现或走 OfficeCLI。
- 当前栈许可证:docx-editor-core V1 = **Apache-2.0** ✓,OfficeCLI = **Apache-2.0** ✓(已核实 LICENSE 文件)。

## 5. 之后要做什么(顺序)

1. **能力盘点(仅 Word)**:拉全库导出清单(命令/节点/headless API/React 组件)× OfficeCLI Word 能力 × WPS 对标表 → 产出 `.dev/plan/wps-benchmark/capability-audit.md`(边界:哪些走 UI、哪些走现有 agent、哪些走 OfficeCLI、哪些两边都没有)
2. **OfficeCLI 保真 spike**(已决定引入):最小 `officecli_exec` Tauri 命令 + 真实文档(含图片/表格/修订)回环测试
3. **P0 实施**:样式库(`applyStyle` 接线 + UI)+ 目录(`generateTOC`)+ 水印(`setWatermark`)+ 分栏(`w:cols`)——拆 worktree 分支,沿用 ui-overhaul 流程
4. **布局改进**:文件标签改全屏 Backstage(已决策)+ 快速访问工具栏/功能区折叠/状态栏缩放成组/导航窗格(按需)
5. **OfficeCLI 正式接入**:`officecli_exec` 命令 + agent 工具暴露(公式/图/图表/OLE 走 OfficeCLI)

## 6. 已决策(2026-08-14)

1. **引入 OfficeCLI** — agent 后端换 OfficeCLI,先做往返保真 spike。
2. **P0 功能范围** — 样式库 + 目录 + 水印 + 分栏(剪贴板/导出 PDF 暂缓)。
3. **能力盘点范围** — 仅 Word(Excel/PPT 不列入本轮)。
4. **文件面板** — 改全屏 Backstage(对标 WPS)。
5. **许可证约束** — 不引入 AGPL;superdoc V2(AGPL-3.0)仅参考设计思路;栈锁定 docx-editor-core V1(Apache-2.0)+ OfficeCLI(Apache-2.0)。

## 7. 附:已归档

- 换皮实施计划已移至 `.dev/archive/ui-overhaul/`(用户手动移动,未提交)。
