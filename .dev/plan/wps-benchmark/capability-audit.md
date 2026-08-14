# 能力盘点(capability audit)—— 库 × OfficeCLI × WPS 对标

> 状态:盘点完成(数据采集 2026-08-14,基于 @eigenpal/docx-editor-core 1.3.2)
> 产出:边界地图(哪些走 UI/库、哪些走 OfficeCLI、哪些自研/放弃)

## 1. 目的

回答一个问题:**每个 WPS 对标功能,底层能力在哪里?** 三方数据源:

1. `@eigenpal/docx-editor-core` 1.3.2(命令 / 节点 / headless API / React UI)
2. OfficeCLI(Word 命令)
3. WPS 对标清单(§3.2 of wps-benchmark.md)

## 2. docx-editor-core 能力清单

### 2.1 已公开命令(可直接接线)

| 域 | 命令 |
| --- | --- |
| 文本格式 | toggleBold/Italic/Strike/Sub/Sup/Underline、setFontFamily/setFontSize/setTextColor/setHighlight/setUnderlineStyle、clear*(清空)、createSet/RemoveMarkCommand、insertHyperlink/removeHyperlink/setHyperlink、isMarkActive/getMarkAttr |
| 段落 | align*/setAlignment、setIndent*(左/右/首行)、increaseIndent/decreaseIndent、setLineSpacing/单倍/1.5/双倍、setSpaceBefore/After、**applyStyle/clearStyle/getStyleId**、toggleBulletList/toggleNumberedList/removeList/increaseListLevel/decreaseListLevel、setLtr/setRtl、addTabStop/removeTabStop、**generateTOC** |
| 表格(32 个) | insertTable、addColumnLeft/Right、addRowAbove/Below、deleteColumn/Row/Table、mergeCells/splitCell、selectRow/Column/Table、setCellBorder/setCellFillColor/setCellMargins/setCellVerticalAlign/setCellTextDirection/setRowHeight、setAll/Inside/OutsideTableBorders/removeTableBorders/setTableBorderColor/Width、setTableProperties/applyTableStyle/autoFitContents/distributeColumns/toggleHeaderRow/toggleNoWrap |
| 图片 | setImageWrapType(环绕)、insertImageNode(tracked 插入) |
| 页面 | insertPageBreak、**setWatermark/getWatermarkFromState** |
| 审阅评论 | addCommentMark/removeCommentMark、acceptChange/rejectChange/**acceptChangeById/rejectChangeById**/acceptAllChanges/rejectAllChanges/findNext/PreviousChange、toggleSuggestionMode/isSuggestionModeActive |
| 桥接(已接) | **applyFormatting(view,{paraId,search,marks})**、**setParagraphStyle(view,{paraId,styleId},resolver)**、StyleResolver(OOXML 样式级联) |

### 2.2 节点已存在、但无公开 insert 命令(需自写命令,序列化现成)

| 节点 | 含义 | 说明 |
| --- | --- | --- |
| math | 公式 | 有节点,无 LaTeX 输入 |
| shape / textBox | 形状 / 文本框 | 有节点 |
| field | 域 | 有节点(页码/交叉引用/日期底子) |
| footnoteRef | 脚注引用 | Raven 已自建 FootnoteDialog 绕过了 |
| sdt / blockSdt | 内容控件 | Raven 模板变量已自建绕过 |
| horizontalRule | 分隔线 | 有节点 |
| columnBreak / sectionBreak / w:cols | 分栏符/分节符/分栏 | **仅内部序列化函数,无公开命令** |

### 2.3 headless API

- 序列化:`parseDocx`、`serializeDocx`、`serializeDocumentBody`、`serializeSectionProperties`
- 查询:`getParagraphs/getParagraphText/getBodyText`、`countWords/countCharacters`、`getTableText`、`hasImages/hasTables/hasHyperlinks`、`isHeadingStyle/parseHeadingLevel`
- 内容控件:`findContentControls/setContentControlContent/getContentControlText`、repeating section 增删
- 水印:`getDocumentWatermark/setDocumentWatermark`
- Agent:`createAgent/executeCommand/getDocumentSummary/getSelectionFormattingSummary`

### 2.4 React 自带 UI(34 组件)

MenuBar、Toolbar、ToolbarButton/Group/Separator、TitleBar、AlignmentButtons、ListButtons、ColorPicker、FontPicker、FontSizePicker、**StylePicker**、LineSpacingPicker、**HorizontalRuler**、ZoomControl、InsertImageDialog、**InsertSymbolDialog**、InsertTableDialog、HyperlinkDialog、FindReplaceDialog、PageSetupDialog、PrintButton、TableToolbar 系列…

> Raven 重复实现了其中一部分(Ruler/ColorPicker/FontCombobox/InsertTableGrid/HyperlinkDialog/PageSetupDialog/FindReplace)。**保留 Raven 自绘(样式统一),库组件作逻辑参考或 fallback。**

### 2.5 库明确没有

拼写/语法检查、比较文档、导出 PDF(有 HTML 渲染 `renderAsync` 可走打印)、翻译、多视图(阅读/大纲/草稿)、网格线、拆分窗口、全屏/护眼、加密/保护、封面页模板。

## 3. OfficeCLI Word 能力

段落(framePr/tabs/字符缩进)、运行(underline.color/position)、表格(虚拟列操作/hMerge)、样式、文本框/形状(旋转/文字方向/渐变/阴影/透明度)、页眉页脚、图片(PNG/JPG/GIF/SVG)、**公式(LaTeX)**、**图(mermaid → 可编辑形状 或 PNG)**、评论、脚注、水印、书签、目录、**图表**、超链接、节、表单、内容控件、**域(22 零参数类型 + MERGEFIELD/REF/PAGEREF/SEQ/STYLEREF/DOCPROPERTY/IF)**、**OLE**、修订(type/action/per-target 选择器/tracked 查找替换)、页面背景、文档属性、i18n/RTL、**HTML/PNG 渲染(agent 视觉)**。

## 4. WPS 对标 × 能力归属表(核心)

图例:🟢 库命令现成 · 🟡 库节点有(自写命令) · 🔵 OfficeCLI · ⚪ 均无

| WPS 功能 | 库 | OfficeCLI | 归属建议 |
| --- | --- | --- | --- |
| **样式库(标题1–9)** | 🟢 applyStyle/getStyleId + StylePicker | 🔵 styles | **库(接线 applyStyle + StylePicker)** |
| **目录** | 🟢 generateTOC + field | 🔵 TOC | **库(接线 generateTOC)** |
| **水印** | 🟢 setWatermark | 🔵 watermarks | **库(接线 setWatermark)** |
| **分栏** | 🟡 w:cols(仅序列化) | 🔵 sections | ⚠️ 见 §6 |
| 剪贴板(复制粘贴) | 🟡 PM 原生 + 浏览器 clipboard | — | 库(PM 原生命令 + 快捷键) |
| 多级列表 | 🟢 increaseListLevel/toggleNumberedList | — | 库(替换现有 wrapIn/lift) |
| 表格补齐(增删行列/边框/自动调整) | 🟢 32 命令(只接了~10) | 🔵 表格 | 库(补接线剩余命令) |
| 超链接 | 🟢 insertHyperlink/removeHyperlink | 🔵 hyperlinks | 库(已接线,核对) |
| 符号 | 🟢 InsertSymbolDialog(组件) | — | 库(用库组件逻辑 + 自绘 UI) |
| 公式 | 🟡 math 节点(无 LaTeX) | 🔵 **LaTeX 输入** | **OfficeCLI(agent 通道)** |
| 图表 | ⚪ 无 chart 节点 | 🔵 **charts** | **OfficeCLI(agent 通道)** |
| mermaid 图 | ⚪ | 🔵 **diagrams** | **OfficeCLI(agent 通道)** |
| OLE | ⚪ | 🔵 **OLE** | **OfficeCLI(agent 通道)** |
| 题注/书签/交叉引用 | 🟡 field 节点 | 🔵 bookmarks + fields(REF/PAGEREF/SEQ) | OfficeCLI(agent 通道)或自写 field 命令 |
| 页码 | 🟡 field + 页眉页脚 | 🔵 fields | 库(页眉页脚编辑器扩展) |
| 文本框/形状 | 🟡 textBox/shape 节点 | 🔵 textbox/shape | OfficeCLI(agent 通道)或自写 insert 命令 |
| 分隔符(分页/分节/分栏) | 🟢 分页符;🟡 分栏(数据模型原生支持,自写直改命令);分节符🟡 | 🔵 sections | 分页符走库;分栏已定自研;分节符待定 |
| 页眉页脚 | 🟢 getHfPmView(hf) | 🔵 headers/footers | 库(已自建 HeaderFooterEditor,核对) |
| 封面页/空白页 | ⚪ | — | 自研(模板)或放弃 |
| 修订(track changes) | 🟢 完整(by-id/接受拒绝/定位) | 🔵 revisions(type/action) | 库(已接线,可增强 by-id) |
| 评论 | 🟢 addCommentMark/removeCommentMark | 🔵 comments | 库(已接线,核对) |
| 内容控件/表单 | 🟡 sdt 节点 | 🔵 SDT/form fields | Raven 模板变量已自建;表单走 OfficeCLI |
| 拼写检查 | ⚪ | ⚪ | **均无 → 自研或放弃** |
| 翻译/同义词 | ⚪ | ⚪ | **均无 → 放弃** |
| 比较文档 | ⚪ | ⚪ | **均无 → 放弃** |
| 导出 PDF | ⚪(有 HTML 渲染可打印) | ⚪(有 HTML/PNG 渲染) | 自研:serialize → 打印/转 PDF |
| 文档加密/保护 | ⚪ | ⚪ | 自研(Tauri 端)或放弃 |
| 多视图(阅读/大纲/草稿) | ⚪ | — | 自研 |
| 网格线/参考线 | ⚪ | — | 自研(简单) |
| 拆分窗口 | ⚪ | — | 自研 |
| 全屏/护眼 | ⚪ | — | 自研(简单,前端) |
| 崩溃恢复 | ⚪ | — | 自研(自动保存已有底子) |
| 云同步/版本历史 | ⚪ | — | 自研/放弃 |

## 5. 边界地图(结论)

```text─────────────────────────────────────────────────────────┐
│ 用户 UI 直连(库命令现成,接线 + 自绘 UI)                │
│   样式库 · 目录 · 水印 · 多级列表 · 表格补齐 · 超链接   │
│   符号 · 分页符 · 页眉页脚 · 修订/评论                  │
├─────────────────────────────────────────────────────────┤
│ 用户 UI(库节点有,需自写 insert 命令)                   │
│   域(页码/日期) · 文本框/形状(非 LaTeX) · 分隔线        │
├─────────────────────────────────────────────────────────┤
│ OfficeCLI(agent 通道,公式/图/图表/OLE 独有能力)         │
│   LaTeX 公式 · mermaid 图 · 图表 · OLE · 表单/域全集    │
│   书签/题注/交叉引用(agent 按需) · 分栏(备选)          │
├─────────────────────────────────────────────────────────┤
│ 均无(自研或放弃)                                        │
│   拼写 · 比较 · 翻译 · 导出 PDF · 加密 · 多视图         │
│   网格线 · 拆分 · 全屏/护眼 · 崩溃恢复 · 云同步         │
└─────────────────────────────────────────────────────────┘
```

## 6. 对 P0 的影响(关键发现)

P0 已决策:样式库 + 目录 + 水印 + 分栏。盘点后:

- **样式库 / 目录 / 水印**:🟢 库命令现成,**纯接线 + 自绘 UI**,零风险。
  - 样式库:✅ 已接(`applyFormatting`/`setParagraphStyle` 委托 ref API + `applyStyle`/`StyleResolver` + `StylePicker`)。
  - 目录:`generateTOC`。
  - 水印:`setWatermark`。
- **分栏**:✅ **spike 已确认 V1 原生支持**(实测 parse→serialize 往返无损,见下)。

  spike 实测(用 `parseDocx`/`serializeDocx` 跑真实 docx):
  1. `SectionProperties` 类型**完整支持分栏**:`columnCount`/`columnSpace`/`equalWidth`/`separator`/`columns[]`。
  2. `parseDocx` 解析 `w:cols w:num="2"` → `finalSectionProperties.columnCount:2, columnSpace:720` ✅
  3. `serializeDocx` 序列化回 `<w:cols w:num="2" w:space="720">` ✅
  4. ⚠️ 但**无公开“设置分栏”命令**:`getLayout()` 返回只读快照(无 setColumns),`setSectionProperties` 命令字符串在库中不存在(Raven 页面设置的回退路径是理想化的)。

  **实现路径(已定)**:headless 直改 —— `bridge.getDocument()` → 改 `package.document.finalSectionProperties.columnCount` → `serializeDocx` + `repackDocx` → reload(复用 Raven 现有 `reloadFromTemp`)。**数据模型原生支持,无需走 OfficeCLI,但要自写“改 OOXML → 重载”命令(中工作量)**。

## 6.1 许可证边界(硬约束)

- **不引入 AGPL**。superdoc V2(AGPL-3.0)仅作设计参考(分栏/节/页眉页脚的原生 OOXML 处理思路),不引入代码。
- 当前栈:docx-editor-core V1 = Apache-2.0 ✓,OfficeCLI = Apache-2.0 ✓(已核实 LICENSE)。

## 7. 下一步(更新)

1. **P0 四项全部敲定**(2026-08-14 分栏 spike 后):
   - 样式库 / 目录 / 水印:🟢 纯接线(PM 命令包装)
   - 分栏:🟡 V1 原生支持,自写 headless 直改命令 + 自绘 UI(中工作量)
2. **P0 拆 worktree 分支实施**(四项,沿用 ui-overhaul 流程)。
3. **OfficeCLI 保真 spike**(已决定引入):`officecli_exec` 命令 + 真实文档回环。
4. 之后按 §4 归属表逐项排期。
