# 后期路线图(P1–P5 + 布局 + 架构债)

> 状态:待实施(前期:能力盘点 + P0 已定,实施已交同事)
> 依赖:capability-audit.md(能力归属)、p0-implementation.md(P0 技术细节)

## 0. 定位

P0(样式库/目录/水印/分栏)是"补齐基本闭环"。本文规划 P0 之后的全景,按能力来源分四类(沿用 capability-audit 的图例):

- 🟢 库命令现成(接线 + UI)
- 🟡 库节点有、命令无(自写命令,序列化现成)
- 🔵 OfficeCLI(agent 通道)
- ⚪ 均无(自研或放弃)

## 1. 阶段总览

| 阶段 | 主题 | 内容 | 主要能力来源 |
| --- | --- | --- | --- |
| P1 | 文档结构 | 多级列表、分节符、页码、题注/书签/交叉引用 | 🟢 + 🟡 |
| P2 | 插入丰富度 | 符号、文本框/形状、封面页;公式/图/图表/OLE 走 OfficeCLI | 🟢🟡 + 🔵 |
| P3 | 审阅专业度 | 修订 by-id 增强;拼写/比较/翻译/保护(均无) | 🟢 + ⚪ |
| P4 | 视图体验 | 网格线、全屏/护眼、拆分、单双页、多视图 | ⚪(前端) |
| P5 | 平台能力 | 导出 PDF/多格式、崩溃恢复、加密、云同步 | ⚪ |
| — | 布局 | Backstage 全屏、快速访问工具栏、折叠、状态栏、导航窗格 | 前端自研 |
| — | 架构债 | commands.ts 拆分、headless 统一、表格/列表命令补齐 | 重构 |
| — | OfficeCLI | 保真 spike → officecli_exec → agent 工具 | 见 officecli-integration.md |

## 2. P1 文档结构

| 项 | 能力 | 技术路径 | 依赖 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 多级列表 | 🟢 increaseListLevel/decreaseListLevel/toggleNumberedList/toggleBulletList/removeList | 替换现有 wrapIn/lift 实现(commands.ts 已用弱命令) | 无 | 低 | 高 |
| 分节符 | 🟢 insertSectionBreak/removeSectionBreak(spike 发现) | 包装进 commands.ts + Layout 标签按钮 | 无 | 低 | 高 |
| 页码 | 🟡 field(PAGE)+ 页眉页脚 getHfPmView | 自写 insertField 命令 + 页眉页脚编辑器加页码按钮 | P0 分栏? | 中 | 中 |
| 题注/书签/交叉引用 | 🟡 field(REF/PAGEREF/SEQ) | 自写 insertField + 书签标记命令;或 agent 走 OfficeCLI | 无 | 中 | 中 |

> 说明:P1 前三项是 P0 的延续(同属"页面/引用"组),可紧随 P0。

## 3. P2 插入丰富度

| 项 | 能力 | 技术路径 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- |
| 符号 | 🟢 InsertSymbolDialog(库组件逻辑) | 自绘 UI + 复用库插入逻辑 | 低 | 中 |
| 文本框/形状 | 🟡 textBox/shape 节点 | 自写 insert 命令(节点+序列化现成) | 中 | 低 |
| 封面页/空白页 | ⚪ | 自研(模板页)或放弃 | 中 | 低 |
| LaTeX 公式 | 🔵 equations(LaTeX) | OfficeCLI agent 通道 | 见 OfficeCLI | 中 |
| mermaid 图 | 🔵 diagrams | OfficeCLI agent 通道 | 见 OfficeCLI | 中 |
| 图表 | 🔵 charts | OfficeCLI agent 通道 | 见 OfficeCLI | 低 |
| OLE | 🔵 OLE | OfficeCLI agent 通道 | 见 OfficeCLI | 低 |

## 4. P3 审阅专业度

| 项 | 能力 | 技术路径 | 工作量 | 决策 |
| --- | --- | --- | --- | --- |
| 修订 by-id 增强 | 🟢 acceptChangeById/rejectChangeById | 增强现有 ReviewTab(现有用 range 版) | 低 | 建议做 |
| 拼写检查 | ⚪ 均无 | 自研(浏览器 spellcheck 叠加/第三方词典)或放弃 | 高 | **待决策** |
| 比较文档 | ⚪ 均无 | 自研(diff 两 docx)或放弃 | 高 | **待决策** |
| 翻译/同义词 | ⚪ 均无 | 放弃(agent 可代做)或接外部 API | 低 | **待决策** |
| 保护/加密 | ⚪ 均无 | 自研(Tauri 端 OOXML 加密)或放弃 | 高 | **待决策** |

> P3 的 ⚪ 项是"均无"重灾区,建议**暂缓或放弃**,优先把 🟢🟡 的能力做满(对标价值更高)。

## 5. P4 视图体验(纯前端,自研)

| 项 | 工作量 | 优先级 |
| --- | --- | --- |
| 网格线/参考线 | 低 | 中 |
| 全屏/护眼模式 | 低 | 中 |
| 状态栏缩放成组 | 低 | 高(布局项) |
| 单页/双页显示 | 中(依赖编辑器渲染) | 低 |
| 拆分窗口 | 中 | 低 |
| 多视图(阅读/大纲/草稿) | 高 | **暂缓(已决策)** |

## 6. P5 平台能力

| 项 | 技术路径 | 工作量 | 决策 |
| --- | --- | --- | --- |
| 导出 PDF | 自研:serializeDocx → Tauri 端渲染(或浏览器打印→PDF) | 高 | **暂缓(已决策)** |
| 导出 txt/md/html | 🟢 headless getBodyText/serialize → 自研转换 | 低 | 建议做 |
| 崩溃恢复 | 自研:自动保存已有底子(useAutoSave) | 中 | 建议做 |
| 云同步/版本历史 | 自研(Tauri + 后端) | 高 | **要做(已决策)** → 见 §6.1 |
| 加密 | 自研(OOXML 加密)或放弃 | 高 | **暂缓(已决策)** |

## 6.1 云同步/版本历史(已决策:要做)

**定位**:文档云端备份 + 版本快照 + 恢复。需后端,是唯一超出本地 Tauri 能力的 P5 项。

**关键技术决策(待定,见 §10)**:

- 后端选择:自建服务 / 对象存储(S3/OSS/COS)/ 第三方文档云
- 同步粒度:文件级快照(简单)vs 实时协作(Yjs/CRDT,复杂)
- 版本粒度:每次保存一个快照 / 自动保存间隔 / 手动版本点

**现有基础**:Raven 已有 Keychain + API key 凭据体系(`saveApiConfig` → `sync_credentials_to_pi`),可复用为云端认证。

## 7. 布局改进(已决策:文件改全屏 Backstage)

| 项 | 工作量 | 优先级 |
| --- | --- | --- |
| Backstage 全屏面板(文件标签) | 中 | 高(已决策) |
| 快速访问工具栏 | 低 | 中 |
| 功能区折叠(双击标签) | 低 | 中 |
| 状态栏缩放成组 | 低 | 高 |
| 导航窗格(增强大纲面板) | 中 | 中 |

## 8. 架构债(建议在 P1 前/并行清)

| 项 | 说明 | 优先级 |
| --- | --- | --- |
| commands.ts 按域拆分 | 500 行 god-file → commands/(formatting/paragraph/table/image/review/document-structure/styles) | 高(增长前必做) |
| 桥接契约补齐 | applyFormatting/setParagraphStyle 空桩(P0 样式库已做) | 高(P0 内) |
| 表格命令补齐 | 库 32 命令只接 ~10(addColumn/deleteRow/autofit/distribute/select/边框全套) | 中 |
| 列表命令替换 | wrapIn/lift → toggleBulletList/increaseListLevel(在 P1 多级列表做) | 中 |
| 数据访问统一 headless | 字数/大纲/正文从直读 PM view → headless getParagraphs/countWords | 中 |
| EditorBridge 类型对齐库 | 手写最小契约 → 对齐库真实 ref API | 中 |

## 9. 建议的推进顺序

```text
P0(实施中,同事)
 └─ 架构债:commands.ts 拆分(增长前必做)
     ├─ P1:多级列表 + 分节符(纯接线,快)
     ├─ 布局:Backstage 全屏 + 状态栏缩放成组(已决策)
     └─ OfficeCLI 保真 spike → 接入(见 officecli-integration.md)
         ├─ P2:符号/文本框 + 公式/图/图表走 agent
         ├─ P1:题注/书签/交叉引用(自写 field 或 agent)
         ├─ P3:修订 by-id 增强
         ├─ P5:导出 txt/md + 崩溃恢复(建议)
         └─ P5:云同步/版本历史(已决策,需先定后端方案)

已暂缓:导出 PDF、拼写/比较/翻译/保护加密、多视图
```

## 10. 已决策(2026-08-14)

1. **导出 PDF** — 暂缓。
2. **拼写检查 / 比较文档 / 翻译 / 保护加密** — 暂缓。
3. **多视图(阅读/大纲/草稿)** — 暂缓。
4. **云同步/版本历史** — 要做(需先定后端方案,见 §6.1)。
