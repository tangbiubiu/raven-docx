# Raven i18n 文案规范

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**: 草案 — 产品决策阶段
>
> **关联文档**：
> - [业务需求 (BRD)](../requirements/requirements-business.md) — 第 1 节：项目愿景
> - [错误状态设计](./error-states.md) — 错误文案

---

## 1. 语言支持

| 语言 | 代码 | 优先级 | 覆盖范围 |
|------|------|--------|---------|
| 简体中文（默认） | `zh-CN` | P0 | 全部 UI 文案 |
| English | `en` | P0 | 全部 UI 文案 |
| 未来扩展 | — | P3 | 社区贡献 |

---

## 2. Key 命名规范

### 2.1 命名格式

```
<模块>.<组件>.<字段>
```

**示例**：
- `document.new` — 新建文档按钮
- `editor.statusBar.wordCount` — 状态栏字数显示
- `settings.apiKey.label` — API Key 输入框标签

### 2.2 模块命名（namespace）

| 前缀 | 范围 |
|------|------|
| `app` | 应用级（标题、菜单） |
| `document` | 文档管理操作 |
| `editor` | 编辑器（大纲、标尺、状态栏） |
| `format` | 格式（工具栏按钮、字体/字号/颜色） |
| `table` | 表格操作 |
| `page` | 页面布局 |
| `ref` | 引用元素（链接、脚注） |
| `review` | 审阅与批注 |
| `agent` | Agent 交互 |
| `template` | 模板变量 |
| `settings` | 设置面板 |
| `find` | 查找替换 |
| `dialog` | 通用对话框文案（确认/取消/关闭） |
| `error` | 错误信息 |
| `menu` | 菜单栏 |
| `toast` | Toast 提示 |

### 2.3 命名规则

| 规则 | 正确 ✅ | 错误 ❌ |
|------|---------|---------|
| 使用 camelCase | `document.saveAs` | `document.SaveAs`, `document.save_as` |
| 语义命名，非位置命名 | `format.fontPicker` | `format.dropdown1` |
| 动词用祈使式 | `document.newDoc` | `document.createNew` (过于冗长) |
| 避免缩写 | `document.openRecent` | `doc.opRct` |
| 标签用 `.label` 后缀 | `settings.apiKey.label` | `settings.apiKeyName` |
| 提示用 `.hint` 后缀 | `settings.apiKey.hint` | `settings.apiKeyHelp` |
| 占位用 `.placeholder` | `settings.apiKey.placeholder` | `settings.apiKeyExample` |

---

## 3. 文案风格指南

### 3.1 中文文案原则

| 原则 | 说明 | 正确 ✅ | 错误 ❌ |
|------|------|---------|---------|
| **简洁** | 能用 2 字不用 4 字 | "保存" | "保存文档到当前路径" |
| **祈使式** | 操作按钮用动词 | "打开文档" | "文档打开功能" |
| **用户视角** | 表述用户会做什么 | "已保存到桌面" | "文件已成功写入目标路径" |
| **中文标点** | 用中文全角标点 | "已保存。" | "已保存." |
| **无技术术语** | 面向普通用户 | "连接失败" | "HTTP 504 错误" |
| **无英文混排** | 除非是专有名词 | "API Key 已保存" | "API Key saved successfully" |

### 3.2 English 文案原则

| 原则 | 说明 | 正确 ✅ | 错误 ❌ |
|------|------|---------|---------|
| **Sentence case** | 标签首字母大写 | "Font size" | "Font Size", "FONT SIZE" |
| **Title case for titles** | 标题用 Title Case | "Save As" | "Save as" |
| **Imperative** | 按钮用祈使式 | "Save" | "Click to save" |
| **No period in labels** | 标签/按钮不加句号 | "Open document" | "Open document." |
| **Oxford comma** | 使用牛津逗号 | "Bold, italic, and underline" | "Bold, italic and underline" |

---

## 4. 文案模板

### 4.1 通用操作

| Key | zh-CN | en |
|-----|-------|-----|
| `dialog.confirm` | 确定 | OK |
| `dialog.cancel` | 取消 | Cancel |
| `dialog.close` | 关闭 | Close |
| `dialog.yes` | 是 | Yes |
| `dialog.no` | 否 | No |
| `dialog.saveChanges` | 是否保存更改？ | Save changes? |
| `dialog.discardChanges` | 放弃更改 | Discard Changes |

### 4.2 菜单

| Key | zh-CN | en |
|-----|-------|-----|
| `menu.file` | 文件 | File |
| `menu.edit` | 编辑 | Edit |
| `menu.view` | 视图 | View |
| `menu.insert` | 插入 | Insert |
| `menu.format` | 格式 | Format |
| `menu.agent` | Agent | Agent |
| `menu.help` | 帮助 | Help |
| `menu.file.new` | 新建 | New |
| `menu.file.open` | 打开… | Open… |
| `menu.file.save` | 保存 | Save |
| `menu.file.saveAs` | 另存为… | Save As… |
| `menu.file.close` | 关闭 | Close |
| `menu.edit.undo` | 撤销 | Undo |
| `menu.edit.redo` | 重做 | Redo |
| `menu.edit.cut` | 剪切 | Cut |
| `menu.edit.copy` | 复制 | Copy |
| `menu.edit.paste` | 粘贴 | Paste |
| `menu.edit.find` | 查找… | Find… |
| `menu.edit.replace` | 替换… | Replace… |
| `menu.view.outline` | 大纲 | Outline |
| `menu.view.ruler` | 标尺 | Ruler |
| `menu.view.zoomIn` | 放大 | Zoom In |
| `menu.view.zoomOut` | 缩小 | Zoom Out |
| `menu.insert.table` | 表格… | Table… |
| `menu.insert.image` | 图片… | Image… |
| `menu.insert.link` | 链接… | Link… |
| `menu.insert.pageBreak` | 分页符 | Page Break |
| `menu.agent.panel` | Agent 面板 | Agent Panel |
| `menu.agent.send` | 发送给 Agent | Send to Agent |
| `menu.settings.open` | 设置… | Settings… |

### 4.3 文档操作

| Key | zh-CN | en |
|-----|-------|-----|
| `document.new` | 新建文档 | New Document |
| `document.open` | 打开文档 | Open Document |
| `document.save` | 保存 | Save |
| `document.saveAs` | 另存为… | Save As… |
| `document.saved` | 已保存 | Saved |
| `document.saving` | 正在保存… | Saving… |
| `document.unsaved` | 未保存 | Unsaved |
| `document.modified` | 已修改 | Modified |
| `document.unnamed` | 未命名文档 | Untitled Document |
| `document.recentFiles` | 最近文件 | Recent Files |
| `document.noRecent` | 暂无最近文件 | No recent files |
| `document.fileType` | Word 文档 (*.docx) | Word Document (*.docx) |

### 4.4 编辑器状态栏

| Key | zh-CN | en |
|-----|-------|-----|
| `editor.statusBar.page` | 第 {current} / {total} 页 | Page {current} of {total} |
| `editor.statusBar.wordCount` | {count} 字 | {count} words |
| `editor.statusBar.cursor` | 行 {line}，列 {col} | Ln {line}, Col {col} |
| `editor.statusBar.zoom` | {zoom}% | {zoom}% |
| `editor.outline.title` | 大纲 | Outline |
| `editor.outline.empty` | 暂无可导航标题 | No headings to navigate |

### 4.5 格式工具栏

| Key | zh-CN | en |
|-----|-------|-----|
| `format.bold` | 加粗 | Bold |
| `format.italic` | 斜体 | Italic |
| `format.underline` | 下划线 | Underline |
| `format.strikethrough` | 删除线 | Strikethrough |
| `format.font` | 字体 | Font |
| `format.fontSize` | 字号 | Font Size |
| `format.textColor` | 字体颜色 | Font Color |
| `format.highlight` | 高亮 | Highlight |
| `format.superscript` | 上标 | Superscript |
| `format.subscript` | 下标 | Subscript |
| `format.heading1` | 标题 1 | Heading 1 |
| `format.heading2` | 标题 2 | Heading 2 |
| `format.heading3` | 标题 3 | Heading 3 |
| `format.heading4` | 标题 4 | Heading 4 |
| `format.heading5` | 标题 5 | Heading 5 |
| `format.heading6` | 标题 6 | Heading 6 |
| `format.normal` | 正文 | Normal |
| `format.alignLeft` | 左对齐 | Align Left |
| `format.alignCenter` | 居中 | Center |
| `format.alignRight` | 右对齐 | Align Right |
| `format.alignJustify` | 两端对齐 | Justify |
| `format.orderedList` | 有序列表 | Ordered List |
| `format.unorderedList` | 无序列表 | Bullet List |
| `format.indent` | 增加缩进 | Increase Indent |
| `format.outdent` | 减少缩进 | Decrease Indent |
| `format.clearFormat` | 清除格式 | Clear Formatting |

### 4.6 Agent 交互

| Key | zh-CN | en |
|-----|-------|-----|
| `agent.title` | Agent 写作助手 | Agent Writing Assistant |
| `agent.panel.tabChat` | 对话 | Chat |
| `agent.panel.tabComments` | 批注 | Comments |
| `agent.input.placeholder` | 输入指令，如"润色这段文字" | Enter a command, e.g. "Polish this text" |
| `agent.input.send` | 发送 | Send |
| `agent.input.stop` | 停止 | Stop |
| `agent.cmdPalette.placeholder` | 输入指令或搜索… | Type a command or search… |
| `agent.cmdPalette.empty` | 输入自然语言指令操作文档 | Type a natural language command |
| `agent.action.rewrite` | 润色 | Polish |
| `agent.action.expand` | 扩写 | Expand |
| `agent.action.summarize` | 摘要 | Summarize |
| `agent.action.translate` | 翻译 | Translate |
| `agent.action.explain` | 解释 | Explain |
| `agent.action.fixGrammar` | 修复语法 | Fix Grammar |
| `agent.action.makeFormal` | 更正式 | More Formal |
| `agent.action.makeCasual` | 更随意 | More Casual |
| `agent.action.custom` | 自定义指令 | Custom |
| `agent.action.continueWriting` | 续写 | Continue Writing |
| `agent.action.formatDoc` | 排版优化 | Format Document |
| `agent.action.proofread` | 全文校对 | Full Proofread |
| `agent.status.idle` | 就绪 | Ready |
| `agent.status.thinking` | 思考中… | Thinking… |
| `agent.status.writing` | 正在生成… | Writing… |
| `agent.status.applying` | 正在应用… | Applying… |
| `agent.status.error` | 请求失败 | Request Failed |
| `agent.status.noConfig` | 未配置 API Key | API Key not configured |
| `agent.status.disconnected` | Agent 已断开 | Agent disconnected |
| `agent.suggestion.accept` | 接受 | Accept |
| `agent.suggestion.reject` | 拒绝 | Reject |
| `agent.suggestion.preview` | 预览 | Preview |
| `agent.context.cursorAt` | 光标：{position} | Cursor: {position} |
| `agent.context.selection` | 已选中 {count} 字 | {count} characters selected |

### 4.7 设置

| Key | zh-CN | en |
|-----|-------|-----|
| `settings.title` | 设置 | Settings |
| `settings.close` | 完成 | Done |
| `settings.apiKey` | API Key 配置 | API Key Configuration |
| `settings.apiKey.type` | 服务商 | Provider |
| `settings.apiKey.key` | API Key | API Key |
| `settings.apiKey.keyPlaceholder` | 输入 API Key | Enter API Key |
| `settings.apiKey.baseUrl` | 自定义地址（可选） | Custom URL (optional) |
| `settings.apiKey.baseUrlPlaceholder` | https://api.example.com | https://api.example.com |
| `settings.apiKey.model` | 模型 | Model |
| `settings.apiKey.test` | 测试连接 | Test Connection |
| `settings.apiKey.testing` | 测试中… | Testing… |
| `settings.apiKey.success` | 连接成功 | Connected |
| `settings.apiKey.failed` | 连接失败 | Connection Failed |
| `settings.apiKey.masked` | {prefix}…{suffix} | {prefix}…{suffix} |
| `settings.model.title` | 模型设置 | Model Settings |
| `settings.model.thinking` | 推理模式 | Thinking Mode |
| `settings.model.streaming` | 流式输出 | Streaming Output |
| `settings.editor.title` | 编辑器偏好 | Editor Preferences |
| `settings.editor.theme` | 主题 | Theme |
| `settings.editor.themeLight` | 浅色 | Light |
| `settings.editor.themeDark` | 深色 | Dark |
| `settings.editor.themeSystem` | 跟随系统 | System |
| `settings.editor.language` | 语言 | Language |
| `settings.editor.languageChinese` | 简体中文 | 简体中文 |
| `settings.editor.languageEnglish` | English | English |
| `settings.editor.fontSize` | 默认字号 | Default Font Size |
| `settings.editor.autoSave` | 自动保存 | Auto Save |
| `settings.data.title` | 数据管理 | Data Management |
| `settings.data.clearSessions` | 清除对话历史 | Clear Chat History |
| `settings.data.clearDrafts` | 清除草稿 | Clear Drafts |
| `settings.data.reset` | 重置所有设置 | Reset All Settings |
| `settings.data.resetWarning` | 这将重置所有偏好设置，不会删除文档 | This will reset all preferences. Documents will not be deleted |

### 4.8 表格

| Key | zh-CN | en |
|-----|-------|-----|
| `table.insert` | 插入表格 | Insert Table |
| `table.insert.grid` | {rows}×{cols} 表格 | {rows}×{cols} Table |
| `table.insertRow` | 在上方插入行 | Insert Row Above |
| `table.insertRowBelow` | 在下方插入行 | Insert Row Below |
| `table.deleteRow` | 删除行 | Delete Row |
| `table.insertCol` | 在左侧插入列 | Insert Column Left |
| `table.insertColRight` | 在右侧插入列 | Insert Column Right |
| `table.deleteCol` | 删除列 | Delete Column |
| `table.mergeCells` | 合并单元格 | Merge Cells |
| `table.splitCells` | 拆分单元格 | Split Cells |
| `table.deleteTable` | 删除表格 | Delete Table |
| `table.headerRow` | 标题行 | Header Row |
| `table.headerCol` | 标题列 | Header Column |

---

## 5. 实现方式

### 5.1 技术方案

编辑器内部 UI 使用 `@eigenpal/docx-editor-i18n`（内置文案）。
应用 UI 自定义 i18n（zh-CN.ts / en.ts），采用简单的 key-value 对象。

```typescript
// lib/i18n/index.ts
import { useSettingsStore } from "@/stores/useSettingsStore";

const translations: Record<string, Record<string, string>> = {
  "zh-CN": { /* ... */ },
  "en": { /* ... */ },
};

export function t(key: string): string {
  const lang = useSettingsStore.getState().language ?? "zh-CN";
  return translations[lang]?.[key] ?? translations["zh-CN"][key] ?? key;
}

// React Hook
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  return useCallback((key, params) => {
    let text = t(key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, []);
}
```

### 5.2 使用示例

```tsx
function StatusBar() {
  const { t } = useT();
  return (
    <div>
      <span>{t("editor.statusBar.page", { current: 1, total: 5 })}</span>
      <span>{t("editor.statusBar.wordCount", { count: 1200 })}</span>
    </div>
  );
}
```

### 5.3 缺失 Key 处理

- 若 Key 不存在于当前语言 → fallback 到简体中文
- 若 Key 在简体中文也缺失 → 显示 Key 原文（方便识别未翻译项）
- 开发模式下 console.warn 警告缺失 Key

---

## 6. 编辑器和应用 UI 的 i18n 分界

| 区域 | i18n 来源 |
|------|----------|
| DocxEditor 内置 UI（页面渲染、右键菜单） | `@eigenpal/docx-editor-i18n` |
| 应用工具栏、侧栏、对话框 | 自定义 i18n（本规范） |
| 菜单栏 | 自定义 i18n（本规范） |
| 错误信息 | 自定义 i18n（本规范，见 [error-states.md](./error-states.md)） |
| 系统对话框（打开/保存） | 系统原生（Tauri 文件对话框） |
