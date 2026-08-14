# P0 实施计划:样式库 / 目录 / 水印 / 分栏

> 状态:待实施(分栏 spike 已完成,见 capability-audit.md §6)
> 依赖:capability-audit.md 的边界地图;沿用 ui-overhaul 的 worktree 流程

## 0. 总览

| 项 | 形态 | 库 API | 分支 | 工作量 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| 样式库 | 纯接线 | `applyStyle`/`clearStyle`/`getStyleId` + `applyFormatting`/`setParagraphStyle`(空桩)+ `StyleResolver` | ui/p0-styles | 低 | 无 |
| 目录 | 纯接线 | `generateTOC`(Command) | ui/p0-toc | 低 | 样式库 |
| 水印 | 纯接线 | `setWatermark`/`getWatermarkFromState` | ui/p0-watermark | 低 | 无 |
| 分栏 | 自研直改 | `SectionProperties` 数据模型(无 setter) | ui/p0-columns | 中 | 无 |

验证命令(每分支):`bun run typecheck && bunx biome check && bun run test`。i18n 键按 en.ts + zh-CN.ts 成对新增。

## 1. 样式库(ui/p0-styles)

**目标**:开始标签"样式"组从"仅正文"扩展为完整样式库(标题 1–9、正文、引用等,样式来自文档 `styles.xml`)。

**技术要点**:

1. **接桥接空桩**(`src/stores/useDocumentStore.ts` 的 `EditorBridge` + `createEditorBridge`):
   - `applyFormatting(view, { paraId, search, marks })` ← 库 `prosemirror/applyFormatting`
   - `setParagraphStyle(view, { paraId, styleId }, resolver)` ← 同上;`resolver` 由 `StyleResolver` 从文档 styles 构建(级联:docDefaults → Normal → basedOn)
2. **commands.ts 包装**:`execApplyStyle(styleId)` → `applyStyle`;`execClearStyle()` → `clearStyle`;`execGetStyleId()` → `getStyleId`。
3. **UI**:现有"正文"下拉(RibbonFormatButtons / HomeTab 样式组)扩展为样式下拉/画廊。库自带 `StylePicker` 组件可作逻辑参考,UI 用 Raven 自绘(统一样式)。
4. **样式列表来源**:`getDocument().package.styles`(文档实际存在的样式),而非硬编码。

**验收**:选中段落 → 选"标题 1" → 段落变 H1(序列化出 `w:pStyle`),大纲面板同步更新;清除样式回正文。

## 2. 目录(ui/p0-toc)

**目标**:启用现有 disabled 的"目录"按钮(`ReferencesTab` 里 `ribbon-toc` 目前 `disabled` 无 onClick)。

**技术要点**:

1. commands.ts 包装 `execGenerateTOC()` → 库 `generateTOC`(Command,基于 heading 样式 + field 域)。
2. ReferencesTab 目录按钮去 `disabled` + 加 `onClick={execGenerateTOC}`。
3. 依赖 §1 样式库(标题样式是 TOC 识别基础)。

**风险/降级**:`generateTOC` 生成的是 TOC 域指令;若 V1 编辑器渲染层不显示 TOC 内容(需实测),降级为:插入 TOC 域(Word 打开按 F9 更新),或该功能走 OfficeCLI TOC(agent 通道)。

**验收**:文档含标题 → 点目录 → 插入 TOC;保存后 Word 打开可见目录。

## 3. 水印(ui/p0-watermark)

**目标**:文本水印(文字/字号/颜色/版式:斜向或水平),图片水印可选。

**技术要点**:

1. commands.ts 包装 `execSetWatermark(w: Watermark | null)` → 库 `setWatermark`(Command,doc 属性,随 undo/redo);`execGetWatermark()` → `getWatermarkFromState`。
2. `Watermark` = `TextWatermark | PictureWatermark`(库 watermark 类型)。
3. UI:Layout 标签新组"水印"→ 下拉(无/自定义水印)→ 对话框(文本+格式设置)。库无现成水印对话框,需自绘。

**验收**:设文本水印 → 编辑区显示(库 painter 从 PM state 读水印);清除 → 消失;保存后 docx 含水印定义,Word 打开正确。

## 4. 分栏(ui/p0-columns)

**目标**:整页/选区 n 栏,等宽、栏间距、分隔线。**已 spike 确认 V1 数据模型原生支持**(`parseDocx`/`serializeDocx` 往返 `w:cols` 无损,见 capability-audit §6)。

**技术要点(自研)**:

1. **无公开 setter** → headless 直改:
   - `bridge.getDocument()` → OOXML `Document`
   - 改 `doc.package.document.finalSectionProperties`(整页分栏)或段落 `sectionProperties`(分节分栏):`columnCount`/`columnSpace`/`equalWidth`/`separator`/`columns[]`
   - `serializeDocx(doc)` 得 document.xml + `updateDocumentXml(originalBuffer, xml)`(最小改动,保留其余 parts)→ 写临时文件 → `reloadFromTemp`(复用现有 agent 回环基础设施)
2. **关键风险**:PM 编辑的未保存改动需先落盘再直改;渲染层是否按 `columnCount` 分栏**待实测**(模型往返已确认,渲染未验证)。
3. UI:Layout 标签新组"分栏"(1/2/3 栏 + 更多分栏对话框:栏数/栏宽/间距/分隔线)。

**降级**:若编辑器渲染不支持分栏 → 降级为"保存时写入分栏(Word 正确显示),编辑器内近似/不显示",并在计划中标注。

**验收**:设 2 栏 → 编辑区分栏渲染;保存重开保留;Word 打开正常。

## 5. 顺带接线(发现于 spike,可选)

`prosemirror/commands/paragraph.d.ts` 还导出 `insertSectionBreak`/`removeSectionBreak`(分节符)和 `getParagraphTabs`/`addTabStop`/`removeTabStop`(制表位)。分栏分支可顺带包装 `insertSectionBreak`(分节符与分栏同属"页面"组)。

## 6. worktree 与顺序

1. 建 worktree(复用 main 的环境 symlink 方案):`ui/p0-styles`、`ui/p0-toc`、`ui/p0-watermark`、`ui/p0-columns`。
2. **顺序**:样式库先行(TOC 依赖);水印、分栏可并行。
3. 每分支:实现 → 三命令验证 → `chore(merge)` 回 main → 四分支全绿后统一回归(679 tests 基准)。
4. 分栏分支含 spike 遗留的临时脚本清理(`/tmp/cols-spike.ts` 在 /tmp,不涉及仓库)。

## 7. 风险清单

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| TOC 域渲染不支持 | 目录不可见 | 降级插入域 / 走 OfficeCLI |
| 分栏渲染不支持 | 编辑器不分栏 | 保存正确、编辑近似 / 走 OfficeCLI sections |
| StyleResolver 集成复杂 | 样式库延迟 | 简化:硬编码常见标题样式,直接 applyStyle(styleId) |
| getDocument() 未含 PM 未保存改动 | 直改丢编辑 | 直改前先落盘(复用 agent 回环的 save→reload) |
