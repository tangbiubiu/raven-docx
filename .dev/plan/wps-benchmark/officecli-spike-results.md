# OfficeCLI 保真 spike 结果(M1)

> 状态:完成(2026-08-14,officecli v1.0.144 × docx-editor-core 1.3.2)
> 结论:验范围完成——文本/结构类安全,图片(可修)、图表/形状(库不支持)排除

## 1. 测试方法

- 基础文档:docx-editor-core `createDocumentWithText` + `createDocx`(模拟 Raven 输出)
- officecli 写入:equation(公式)、field(域)、footnote(脚注)、chart(图表)、diagram(mermaid 原生形状)、picture(图片)、table(表格)
- 往返:docx-editor-core `parseDocx` → 检查 warnings + `repackDocx` → 解包比对 parts + 关键 XML
- 校验:`officecli validate`(OpenXML schema,Word 可打开的代理)
- 隔离测试:图片/表格单独文档重测,排除连带影响

## 2. 结果表

| officecli 写入 | docx-editor-core 往返 | 结论 |
| --- | --- | --- |
| 公式(oMath) | ✓ 保留 | **安全** |
| 域(fldChar/instrText) | ✓ 保留 | **安全** |
| 脚注 | ✓ 保留(footnotes.xml + reference) | **安全** |
| 表格(3×3) | ✓ 保留(tbl/tr/tc 完整) | **安全** |
| 文本段落 | ✓ 保留 | **安全** |
| 图片(picture) | ❌ media 在 parse 阶段丢失 | **根因可修**(见 §3) |
| 图表(chart) | ❌ `c:chart` 引用丢失,压平成无 media 的 `<pic:pic>`,chart1.xml 成孤儿 | **库不支持,排除** |
| mermaid 原生形状 | ❌ 6 个 `wps:wsp` 压平成 1 个无 media 的 `<pic:pic>` | **库不支持,排除** |

- 解析警告:全空 `[]`(parseDocx 不报错,静默丢失)
- validate:通过(丢内容但 schema 合法,Word 能打开但内容缺失/损坏)

## 3. 根因分析

**① 图片丢失(可修)**:officecli 写非标准 relationship `Target="/media/image.png"`(前导斜杠、绝对路径),而库/标准是相对路径 `Target="media/image.png"`。docx-editor-core 按相对路径解析 → 找不到 media → 丢弃。**不是 docx-editor-core 不能处理图片**(它有 image 节点 + addMedia),是 officecli 的 rel 格式不兼容。

**② 图表/原生形状丢失(库限制,不可修)**:docx-editor-core 的 schema 无 chart 节点、无 wps:wsp(WordprocessingShape)往返,parse 时把 `c:chart`/`wps:wsp` 的 drawing 当普通图片,re-serialize 成 `<pic:pic>`。

## 4. 验范围结论(证据驱动)

| 能力 | 走 OfficeCLI? | 说明 |
| --- | --- | --- |
| 公式(LaTeX→oMath) | ✅ 可以 | 库 math 节点完整往返 |
| 域(22 类型) | ✅ 可以 | 库 field 节点完整往返 |
| 脚注 | ✅ 可以 | 库 footnotes 完整往返 |
| 表格增强 | ✅ 可以 | 库 table 完整往返 |
| 书签/题注/交叉引用(文本类) | ✅ 预期可以 | 同 field/文本类,待实测 |
| 图片 | ⚠️ 需先修 rel | officecli rel 路径 bug 修复(或 wrapper 规范化)后预期安全 |
| 图表 | ❌ 排除 | docx-editor-core 不支持 chart 往返 |
| mermaid 原生形状 | ❌ 排除 | 库不支持 wps:wsp 往返;降级 PNG 也依赖图片 rel 修复 |

## 5. 建议动作

1. **图片 rel 问题**:向 officecli 报 issue(rel Target 前导斜杠非标准);或 `officecli_exec` wrapper 在 officecli 写完后规范化 rels(去前导斜杠)。修复后重测图片往返。
2. **图表/形状**:从 OfficeCLI 范围排除,等 docx-editor-core 支持(或改走 agent 的 DocxReviewer 纯文本路径,不碰图表)。
3. **M2 范围收敛**:`officecli_exec` 首批只接 公式/域/脚注/表格/书签(文本结构类),图片待 rel 修复,图表/形状不做。
