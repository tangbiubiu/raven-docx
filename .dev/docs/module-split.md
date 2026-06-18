# Raven 模块拆分方案

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
>
> **变更记录**：
> - v0.2.0 (2026-06-09)：开源化决策，单页面架构，移除 license 模块和 login 页面
> - v0.1.0 (2026-06-08)：初始版本

---

## 1. 顶层视图

```
Raven/
├── src/                      # React 前端
│   ├── pages/                # 页面层（单页面：WorkspacePage）
│   ├── features/             # 业务功能模块（按领域拆分）
│   ├── stores/               # 全局状态（Zustand）
│   ├── hooks/                # 共享 hooks
│   ├── lib/                  # 基础设施（工具、i18n、bindings）
│   └── components/           # 共享 UI 组件
├── src-tauri/src/            # Rust 后端
│   └── commands/             # Tauri commands（file、pi_agent、system）
└── .dev/                     # 设计文档
    ├── requirements/         # BRD、FRS、TSS
    ├── docs/modules/         # 模块设计文档
    └── proto/                # UI 原型（仅视觉参考）
```

---

## 2. 页面层 `pages/`

**架构决策**：单页面应用。WorkspacePage 为唯一路由。

```
pages/
└── WorkspacePage.tsx         # 编辑器主页面（唯一路由）
    ├── DocumentTitleBar      # 文档标题栏（文件名 + 修改标记）
    ├── MenuBar               # 菜单栏（文件、编辑、视图、插入、格式、Agent、帮助）
    ├── Toolbar               # 格式工具栏
    ├── MainArea
    │   ├── OutlinePanel      # 左侧大纲面板（可折叠）
    │   ├── EditorPane        # DocxEditor 编辑器容器
    │   │   ├── Ruler         # 水平标尺
    │   │   └── <DocxEditor>  # @eigenpal/docx-editor-react
    │   └── AgentSidebar      # 右侧 Agent 对话侧栏（可拖拽调整宽度）
    ├── StatusBar             # 底部状态栏（页码、字数、缩放）
    └── SettingsDrawer        # Settings 侧边抽屉面板（从右侧滑出）
```

全局浮层（Portal）：
```
├── CommandPalette             # Cmd/Ctrl+K 命令面板
├── FindReplaceDialog          # Ctrl+F 查找替换
├── PageSetupDialog            # 页面设置对话框
├── HyperlinkDialog            # 超链接对话框
├── InsertTableGrid            # 表格插入网格选择器
└── TableContextMenu           # 表格右键菜单
```

---

## 3. 业务功能模块 `features/`

### 3.1 文档管理 `features/document/` — F-010~017

```
features/document/
├── components/
│   └── DocumentTitleBar.tsx   # 标题栏（文档名 + 修改标记 + 保存状态）
└── hooks/
    ├── useDocument.ts         # 文档打开/保存/另存为
    ├── useAutoSave.ts         # 自动保存 + 崩溃恢复
    └── useRecentFiles.ts      # 最近文件列表
```

### 3.2 编辑器核心 `features/editor/` — F-020~028, F-063~067

```
features/editor/
├── components/
│   ├── EditorPane.tsx          # DocxEditor 容器（桥接 docx-editor-react）
│   ├── OutlinePanel.tsx        # F-065 左侧大纲导航
│   ├── Ruler.tsx               # F-066 水平标尺
│   └── StatusBar.tsx           # F-063 底部状态栏（页码/字数）
└── hooks/useEditorBridge.ts    # DocxEditor ref 封装（暴露给其他模块）
```

### 3.3 格式 `features/formatting/` — F-030~037, F-040~047

```
features/formatting/
├── components/
│   ├── Toolbar.tsx             # F-067 格式工具栏
│   ├── FontPicker.tsx          # F-031 字体选择
│   ├── FontSizePicker.tsx      # F-032 字号选择
│   ├── ColorPicker.tsx         # F-033~034 颜色 & 高亮
│   └── ParagraphPanel.tsx      # F-041~047 段落格式面板
└── hooks/useFormatState.ts     # 格式状态同步（根据选区更新按钮状态）
```

### 3.4 表格 `features/table/` — F-080~086

```
features/table/
├── components/
│   ├── InsertTableGrid.tsx     # F-080 插入表格网格选择器
│   └── TableContextMenu.tsx    # F-082~085 表格右键菜单
└── hooks/useTableOperations.ts
```

### 3.5 页面布局 `features/page-layout/` — F-100~108, F-064

```
features/page-layout/
├── components/
│   ├── PageSetupDialog.tsx     # F-100~102 页面设置对话框
│   ├── HeaderFooterEditor.tsx  # F-103~104 页眉页脚编辑
│   └── ZoomControl.tsx         # F-064 缩放控制
└── hooks/usePageSetup.ts
```

### 3.6 引用元素 `features/references/` — F-110~113

```
features/references/
├── components/
│   ├── HyperlinkDialog.tsx     # F-110 超链接对话框
│   └── FootnoteDialog.tsx      # F-111~112 脚注/尾注对话框
└── hooks/
    ├── useHyperlink.ts
    └── useFootnote.ts
```

### 3.7 审阅与批注 `features/review/` — F-120~122

```
features/review/
├── components/
│   ├── CommentPanel.tsx        # F-122 批注面板
│   └── CommentCard.tsx         # 单条批注卡片
└── hooks/useComments.ts
```

### 3.8 Agent 交互 `features/agent/` — F-050~05B（核心差异化）

```
features/agent/
├── components/
│   ├── AgentSidebar.tsx        # F-056 Agent 对话侧栏
│   ├── CommandPalette.tsx      # F-050 Cmd+K 命令面板
│   ├── QuickActions.tsx        # F-051 快捷操作按钮
│   └── SuggestionPopover.tsx   # 建议浮层
├── hooks/
│   ├── useAgentSession.ts      # Agent 会话生命周期
│   ├── useAgentContext.ts      # 文档上下文采集
│   └── useAgentCommands.ts     # Agent 响应解析与命令执行
└── types.ts                    # AIAction, AgentContext, AgentCommand 等
```

### 3.9 模板变量 `features/template/` — F-130~132

```
features/template/
├── components/
│   └── VariableForm.tsx        # 变量填充表单
└── hooks/useTemplateVars.ts
```

### 3.10 设置 `features/settings/` — F-150~153

```
features/settings/
├── components/
│   ├── ApiKeySection.tsx       # F-150~153 API Key 配置（Provider、Key、模型）
│   └── EditorPreferences.tsx   # F-060~062 编辑器偏好
└── hooks/useSettings.ts
```

### 3.11 查找替换 `features/find-replace/` — F-026

```
features/find-replace/
├── components/
│   └── FindReplaceDialog.tsx   # 查找替换对话框
└── hooks/useFindReplace.ts
```

---

## 4. 共享基础设施

### 4.1 `lib/` — 基础设施

```
lib/
├── bindings.ts                 # tauri-specta 自动生成（@/lib/bindings）
├── cn.ts                       # classname 工具 (clsx + tailwind-merge)
├── logger.ts                   # 统一日志（tauri-plugin-log）
├── tauri-events.ts             # Tauri event 监听封装
└── i18n/
    ├── index.ts                # i18n 实例
    ├── zh-CN.ts                # 简体中文
    └── en.ts                   # English
```

### 4.2 `hooks/` — 共享 hooks

```
hooks/
├── useTauriCommand.ts          # Tauri command 调用封装（统一 error handling）
└── useKeyboard.ts              # 全局快捷键管理
```

### 4.3 `stores/` — 全局状态（Zustand）

```
stores/
├── useDocumentStore.ts      # 文档状态（path、isDirty、selection、zoom、pages）
├── useAgentStore.ts         # Agent 会话状态（messages、status、pendingAction）
├── useSettingsStore.ts      # 全局设置（apiConfig、theme、language、editorPrefs）
└── useAppStore.ts           # 应用级状态（activePanel、toast、modals）
```

### 4.4 编辑器桥接

```
features/editor/
└── hooks/useEditorBridge.ts  # DocxEditor ref 封装，暴露 getAgent/getDocument/save 等
```

---

## 5. Tauri 后端 `src-tauri/src/commands/`

| 文件 | 对应前端模块 | 命令 |
|------|-------------|------|
| `commands/file.rs` | `features/document` | `open_docx`, `save_docx`, `save_as_docx`, `get_recent_files` |
| `commands/pi_agent.rs` | `features/agent` | `pi_spawn`, `pi_send`, `pi_abort`, `pi_get_status` |
| `commands/system.rs` | `lib/tauri-events` | `get_system_info`, `window_title_changed` |

---

## 6. 实施路径（分 Phase）

> 迭代计划映射见 [BRD §5](../../requirements/requirements-business.md)。

| Phase (开发) | 版本 (发布) | 主题 |
|-------------|------------|------|
| Phase 1 | — | 骨架搭建 |
| Phase 2 | — | 编辑器核心 |
| Phase 3 | v0.1.0-beta | Agent 集成 |
| Phase 4 | v1.0.0 | 完善 |

### Phase 1 — 骨架搭建

> **目标**：跑通最小闭环 — 编辑器渲染 + API Key 配置 + Agent 命令面板

- [ ] 1.1 安装 `@eigenpal/docx-editor-core` `@eigenpal/docx-editor-react` `@eigenpal/docx-editor-i18n` 依赖
- [ ] 1.2 创建 `WorkspacePage` 单页面（含 Toolbar + EditorPane + StatusBar 布局壳）
- [ ] 1.3 创建 `stores/` 四个状态 store（空壳）
- [ ] 1.4 实现 `features/settings/ApiKeySection`（API Key 配置 + 连接测试）
- [ ] 1.5 Settings 以 Drawer 形式在 WorkspacePage 内打开

**Phase 1 验收**：
- 启动应用即进入 WorkspacePage，显示空白编辑器布局
- 可打开 Settings 抽屉配置 API Key
- API Key 保存到系统 Keychain，测试连接功能可用

### Phase 2 — 编辑器核心

- [ ] 2.1 `features/editor/EditorPane`（集成 DocxEditor）
- [ ] 2.2 `features/editor/OutlinePanel` + `StatusBar`
- [ ] 2.3 `features/formatting/Toolbar`（基础格式按钮）
- [ ] 2.4 `features/document/useDocument`（打开/保存）
- [ ] 2.5 `commands/file.rs`（Tauri 文件 I/O）

### Phase 3 — Agent 集成

- [ ] 3.1 `features/agent/AgentSidebar` + `QuickActions`
- [ ] 3.2 `features/agent/CommandPalette`（Cmd+K）
- [ ] 3.3 `features/agent/hooks/*`（pi agent 会话管理）
- [ ] 3.4 `commands/pi_agent.rs`

### Phase 4 — 完善

- [ ] 4.1 `features/table/` + `features/page-layout/`
- [ ] 4.2 `features/review/` + `features/references/`
- [ ] 4.3 `features/settings/EditorPreferences`
- [ ] 4.4 `features/document/hooks/useAutoSave`（崩溃恢复）

---

## 7. 关键设计决策

| 决策点 | 决策 | 理由 |
|--------|------|------|
| **页面架构** | 单页面（WorkspacePage），Settings 为 Drawer | 桌面应用无需 URL 路由，减少页面切换 |
| **状态管理** | Zustand（4 个独立 store） | 轻量、无 Provider 包裹、与 React Compiler 兼容 |
| **EditorBridge** | `useEditorBridge()` hook 暴露 ref，存入 store | 让格式化 toolbar、Agent 都能通过 bridge 操作编辑器 |
| **pi agent 通信** | 前端 → Tauri command → Rust spawn pi → Event 回流 | JSONL stdin/stdout 协议 |
| **多语言** | `@eigenpal/docx-editor-i18n` + 自定义 i18n | 编辑器内部用 docx-editor-i18n，应用 UI 自建 |
| **CSS 方案** | Tailwind CSS v4 + shadcn/ui | 与项目技术栈一致，设计系统统一 |
| **API Key 存储** | 系统 Keychain（macOS）/ Credential Manager（Windows） | 安全存储，不落盘明文 |
| **开源策略** | 完全开源，无许可/激活系统 | 简化架构，降低用户使用门槛 |

---

## 8. 模块依赖图

```
                    WorkspacePage
                    /     |      \
                   /      |       \
           document    editor    agent
              |          |         |
              |      formatting   |
              |          |         |
         page-layout  table   find-replace
              |
         references    review    template

         settings (Drawer, 独立于页面)
```

所有 feature 通过 `useEditorBridge()` 获取编辑器操作能力。

**依赖方向**（单向）：
- `pages/` → `features/` → `stores/` + `lib/`
- `features/` 之间最低限度耦合（仅通过 store 和 bridge）
- `stores/` 之间不相互引用
- `lib/` 无业务依赖
