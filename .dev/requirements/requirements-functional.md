# Raven 功能需求规格 (FRS)

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**: 草案 — 产品决策后修订
>
> **变更记录**：
> - v0.2.0 (2026-06-09)：开源化决策，移除 F-160~164 许可/激活功能
> - v0.1.0 (2026-06-08)：初始版本
>
> **相关文档**：
> - [业务需求文档 (BRD)](./requirements-business.md) — 第 1~3 节：愿景、用户、范围、验收标准
> - [技术规格 (TSS)](./requirements-technical.md) — 第 5~8 节：NFR、架构、数据模型、Agent 协议

---

## 功能需求表

> 优先级：**Must** = MVP 必需、**Should** = 尽力而为、**Could** = 可延后

### 文档管理

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-010 | 新建文档 | 创建空白 .docx，支持自定义页边距/纸张方向 | Must | `createEmptyDocument` |
| F-011 | 打开文档 | 从本地文件系统选择并解析 .docx | Must | `parseDocx` |
| F-012 | 保存文档 | 完整序列化保存到原路径 | Must | `createDocx` / `repackDocx` |
| F-013 | 另存为 | 选择新路径和文件名保存 | Must | Tauri 文件对话框 |
| F-014 | 最近文件 | 显示最近打开的文档列表 | Should | Tauri 端实现 |
| F-015 | 拖拽打开 | 拖拽 .docx 文件到窗口打开 | Could | Tauri 拖拽事件 |
| F-016 | 自动保存 | 定时/变更时自动保存，崩溃恢复 | Must | `AutoSaveManager` |
| F-017 | 文档属性 | 显示/编辑标题、作者等元数据 | Should | `DocxPackage.properties` |

### 文本编辑

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-020 | 文本输入 | 键盘输入、IME（中文输入法）支持 | Must | ProseMirror 编辑器 |
| F-021 | 光标导航 | 方向键、Home/End、PageUp/Down、Ctrl+方向键 | Must | ProseMirror |
| F-022 | 选区操作 | Shift+方向键、双击选词、三击选段 | Must | ProseMirror |
| F-023 | 复制/粘贴 | Ctrl+C/V，保留格式粘贴（含外部 HTML） | Must | `ClipboardSelection` |
| F-024 | 剪切 | Ctrl+X | Must | ProseMirror |
| F-025 | 撤销/重做 | Ctrl+Z / Ctrl+Shift+Z，支持多步 | Must | ProseMirror history |
| F-026 | 查找替换 | Ctrl+F，支持区分大小写 | Should | `findReplace` utils |
| F-027 | 分页符 | Ctrl+Enter 插入分页符 | Should | `createPageBreak` |
| F-028 | 换行符 | Shift+Enter 软换行 | Should | `createLineBreak` |

### 文本格式

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-030 | 加粗/斜体/下划线/删除线 | Ctrl+B / I / U，支持下划线样式 | Must | `TextFormatting` |
| F-031 | 字体选择 | 系统字体列表，主题字体和中英文字体分开 | Must | `fontOptions` / `FontOption` |
| F-032 | 字号 | 预设 (8-72pt) + 自定义字号，支持中文字号 | Must | `TextFormatting.fontSize` |
| F-033 | 文字颜色 | 主题色/标准色调色板 + 自定义颜色拾取 | Must | `ColorValue` + Theme |
| F-034 | 高亮/底纹 | 15 种预设高亮色 + 段落底纹 (`ShadingProperties`) | Should | `highlightColors` + `resolveShadingColor` |
| F-035 | 上下标 | 上标 Ctrl+Shift+=、下标 Ctrl+= | Should | `vertAlign` |
| F-036 | 字符间距/缩放 | 字符间距调整、水平缩放 | Should | `TextFormatting.spacing` / `scale` |
| F-037 | 小型大写字母/全大写 | 排版级大小写转换 | Should | `smallCaps` / `allCaps` |

### 段落格式

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-040 | 标题样式 | 标题 1-6 + 副标题等预设样式 | Must | `StyleDefinitions` + `applyStyle` |
| F-041 | 对齐 | 左/居中/右/两端/分散对齐 | Must | `ParagraphFormatting.alignment` |
| F-042 | 多级列表 | 有序/无序列表，多级编号，自定义编号格式 | Must | `NumberingDefinitions` |
| F-043 | 缩进 | 左/右缩进、首行缩进、悬挂缩进 | Should | `indentLeft/Right/FirstLine/hangingIndent` |
| F-044 | 行距 | 单倍/1.5 倍/双倍/最小值/固定值/多倍 | Should | `lineSpacing` + `lineSpacingRule` |
| F-045 | 段间距 | 段前/段后间距（自动间距选项） | Should | `spaceBefore` / `spaceAfter` |
| F-046 | 段落边框/底纹 | 四边独立边框样式 + 段落背景底纹 | Should | `ParagraphFormatting.borders` + `shading` |
| F-047 | 制表位 | 左/居中/右/小数点制表位 | Should | `tabs` (TabStop) |

### 表格

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-080 | 插入表格 | 通过网格选择行列数插入表格 | Must | `DocumentAgent.insertTable` |
| F-081 | 表格文本编辑 | 单元格内文本编辑（段落、格式） | Must | ProseMirror TableExtension |
| F-082 | 行列操作 | 插入/删除行、插入/删除列 | Should | ProseMirror 表格插件 |
| F-083 | 单元格合并/拆分 | 水平和垂直合并与拆分 | Should | Table model (colspan/rowspan) |
| F-084 | 表格样式 | 表头行、边框样式、斑马纹 | Should | `TableFormatting` + 表格样式 |
| F-085 | 列宽调整 | 拖拽调整列宽 | Should | `TableSelectionManager` + 列 resize |
| F-086 | 表格对齐/缩进 | 表格整体对齐和缩进 | Should | `TableFormatting` |

### 图片与媒体

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-090 | 插入图片 | 从本地文件系统选择图片插入 | Must | `DocumentAgent.insertImage` |
| F-091 | 图片大小调整 | 拖拽调整图片尺寸，锁定宽高比 | Should | `Image.size` + 拖拽 resize |
| F-092 | 图片位置/环绕 | 嵌入型/四周型/上下型文字环绕 | Should | `Image.wrap` / `Image.position` |
| F-093 | 图片替换/删除 | 右键替换或删除图片 | Should | DocumentAgent 操作 |
| F-094 | 图片 ALT 文本 | 编辑替代文本 | Should | `Image.alt` |

### 页面布局

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-100 | 页边距 | 上/下/左/右页边距设置，预设（普通/窄/适中/宽） | Must | `SectionProperties.margin*` |
| F-101 | 纸张大小 | A4/Letter/Legal + 自定义尺寸 | Must | `SectionProperties.pageWidth/Height` |
| F-102 | 纸张方向 | 纵向/横向切换 | Must | `SectionProperties.orientation` |
| F-103 | 页眉/页脚 | 编辑页眉页脚内容，支持首页不同/奇偶页不同 | Should | `HeaderFooter` + header/footer references |
| F-104 | 页码 | 插入页码字段 | Should | 页脚 SimpleField (PAGE) |
| F-105 | 分节 | 插入分节符（下一页/连续/奇数页/偶数页） | Should | `SectionProperties.sectionStart` |
| F-106 | 分栏 | 两栏/三栏布局 | Should | `SectionProperties.columnCount` / `columns` |
| F-107 | 页面边框 | 整页边框样式 | Should | `SectionProperties.pageBorders` |
| F-108 | 页面背景色 | 页面背景颜色 | Should | `SectionProperties.background` |

### 引用元素

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-110 | 超链接 | 插入/编辑/删除超链接（URL + 显示文本） | Should | `Hyperlink` / `DocumentAgent.insertHyperlink` |
| F-111 | 脚注 | 插入脚注，页面底部显示 | Should | `Footnote` + 脚注布局引擎 |
| F-112 | 尾注 | 插入尾注，文档末尾显示 | Should | `Endnote` |
| F-113 | 书签 | 插入/跳转到书签 | Should | `BookmarkStart` / `BookmarkEnd` |

### 审阅与批注

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-120 | 批注 | 添加/回复/删除/解决批注 | Should | `Comment` + `DocxEditorRef.addComment` |
| F-121 | 修订建议 | Agent 生成修订建议（插入/删除/替换），支持接受/拒绝 | Should | `DocxReviewer` / `TrackedChangeInfo` |
| F-122 | 批注面板 | 右侧或底部批注列表 UI | Should | comments panel |

### Agent 交互（核心差异化）

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-050 | 命令面板 | Cmd/Ctrl+K 唤起，输入自然语言指令 | Must | 自定义 UI + pi agent |
| F-051 | 选中文本润色 | 选中 → 预设动作（更正式/简化/扩写/修复语法） | Must | `AIAction` + `AIActionRequest` + pi |
| F-052 | 全文校对 | 检查拼写、语法、术语一致性，返回修订建议 | Should | `DocxReviewer` 批量建议 + pi |
| F-053 | AI 辅助续写 | 光标处触发，Agent 根据上文和文档大纲续写 | Should | pi agent 流式输出 |
| F-054 | 大纲扩写 | 选中大纲 → 逐项展开为完整段落的文章 | Should | `AgentContext.outline` + pi |
| F-055 | 多语言翻译 | 选中文本 → 翻译为指定语言（保持排版） | Should | `AIAction.translate` + pi |
| F-056 | 对话侧边栏 | 右侧常驻 Agent 对话窗口，感知全文上下文 | Could | 自定义 React 面板 |
| F-057 | 一键排版优化 | Agent 自动调整标题层级/列表/间距/字体一致性 | Should | `executeCommands` + pi |
| F-058 | 摘要生成 | 生成全文/选中区域摘要 | Should | `AIAction.summarize` + pi |
| F-059 | 解释文本 | 解释选中文本的含义/背景 | Should | `AIAction.explain` + pi |
| F-05A | 写作风格转换 | 正式 ↔ 随意风格互转 | Should | `AIAction.makeFormal/makeCasual` + pi |
| F-05B | 自定义 AI 指令 | 自由输入任意自然语言指令 | Must | `AIAction.custom` + pi |

### 模板与变量

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-130 | 变量检测 | 自动检测文档中的模板变量 `{变量名}` | Should | `detectVariables` |
| F-131 | 变量填充 | 交互式填写变量值并应用到文档 | Should | `applyVariables` / `setVariable` |
| F-132 | 模板处理 | 基于已有 docx 模板批量生成文档 | Should | `processTemplate` |

### 用户体验

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-060 | 暗色模式 | 跟随系统 / 手动切换 | Should | Tailwind dark mode |
| F-061 | 多语言界面 | 简体中文（默认）、英语，可扩展 | Must | `@eigenpal/docx-editor-i18n` |
| F-062 | 键盘快捷键 | 完整快捷键覆盖，可自定义 | Should | ProseMirror keymap |
| F-063 | 状态栏 | 页码/总页数、字数、光标位置 | Should | 自定义组件 |
| F-064 | 缩放控制 | 页面缩放滑块 + Ctrl+滚轮 | Must | `EditorCoordinator.setZoom` |
| F-065 | 大纲导航 | 左侧大纲面板，快速跳转标题 | Must | `AgentContext.outline` / heading collector |
| F-066 | 标尺 | 水平/垂直标尺，拖拽调整缩进和边距 | Must | `showRuler` prop |
| F-067 | 工具栏 | 格式工具栏 + 自定义扩展区域 | Must | DocxEditor 内置 + `toolbarExtra` |

### Tauri 桌面端特有

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-140 | 文件关联 | .docx 文件关联，双击打开 | Should | Tauri bundle 配置 |
| F-141 | 系统菜单 | macOS/Windows 原生菜单栏 | Should | Tauri menu API |
| F-142 | 窗口标题 | 窗口标题显示文档名 + 修改标记 | Must | Tauri window API |
| F-143 | 关闭提示 | 未保存修改时提示保存 | Must | Tauri close event |
| F-144 | 自动更新 | 通过 Tauri updater 自动更新应用 | Should | `tauri-plugin-updater` |
| F-145 | 打印 | 调用系统打印对话框 | Should | `window.print()` / `onPrint` |

### API Key 配置

| ID | 功能 | 描述 | 优先级 | 来源 |
|----|------|------|--------|------|
| F-150 | API Key 配置 | 管理 Anthropic/OpenAI 等多个 provider 的 Key | Must | pi agent `auth.json` + 系统 Keychain |
| F-151 | 连接测试 | 验证 API Key 可用性（调用 `get_available_models`） | Should | pi agent RPC 命令 |
| F-152 | 模型选择 | 选择默认模型：Claude Sonnet/Opus、GPT-4o 等 | Must | pi `--model` 启动参数 |
| F-153 | 本地模型配置 | 配置 Ollama/LM Studio 等自托管模型地址 | Should | pi custom provider + `models.json` |
