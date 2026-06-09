# WorkspacePage — 编辑器主页面

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **来源**：`.dev/proto/workspace.html`
> **状态**：草案

---

## 1. 职责

应用主工作区。编排 4 个面板的布局，处理面板的显示/隐藏和拖拽 resize。

---

## 2. 组件结构

```
pages/WorkspacePage.tsx
├── TitleBar                        (features/document/components/DocumentTitleBar)
├── MenuBar                         (features/formatting/components/MenuBar)
├── Toolbar                         (features/formatting/components/Toolbar)
├── MainArea (flex row)
│   ├── OutlinePanel                (features/editor/components/OutlinePanel)
│   │   └── OutlineToggleBtn        (editor 内部)
│   ├── EditorPane                  (features/editor/components/EditorPane)
│   │   ├── Ruler                   (features/editor/components/Ruler)
│   │   ├── EditorScroll
│   │   │   └── <DocxEditor>        (@eigenpal/docx-editor-react)
│   │   └── ResizeHandle (agent pane resize)
│   └── AgentPane
│       ├── AgentHeader + Tabs      (features/agent/components/AgentSidebar)
│       ├── AgentMessages           (features/agent/components/AgentMessageBubble[])
│       ├── CommentsPanel           (features/review/components/CommentPanel)
│       ├── QuickActions            (features/agent/components/QuickActions)
│       └── AgentInputRow           (features/agent/components/AgentSidebar)
└── StatusBar                       (features/editor/components/StatusBar)
    └── ZoomControl                 (features/page-layout/components/ZoomControl)
```

全局浮层（Portal）：
```
├── CommandPalette                  (features/agent/components/CommandPalette)
├── SuggestionPopover               (features/agent/components/SuggestionPopover)
├── SettingsDrawer                  (features/settings/components/SettingsDrawer)
├── FindReplaceDialog               (features/find-replace/components/FindReplaceDialog)
├── PageSetupDialog                 (features/page-layout/components/PageSetupDialog)
├── HyperlinkDialog                 (features/references/components/HyperlinkDialog)
├── InsertTableGrid                 (features/table/components/InsertTableGrid)
└── TableContextMenu                (features/table/components/TableContextMenu)
```

---

## 3. 布局约束

```
┌──────────────────────────────────────────────────────────┐
│ TitleBar                     [traffic lights] [dark btn] │  ~40px
├──────────────────────────────────────────────────────────┤
│ MenuBar    文件 编辑 视图 插入 格式 Agent 帮助              │  ~30px
├──────────────────────────────────────────────────────────┤
│ Toolbar    [undo] [B I U S] [heading▼] [font▼] [align]...│  ~56px
├──────────┬─────────────────────────────────┬────────────┤
│ Outline  │ Ruler                           │ Agent      │
│ Panel    │ ┌─────────────────────────────┐ │ Sidebar    │
│ (220px)  │ │ Document Page (760px)       │ │ (380px)   │
│          │ │                             │ │            │
│          │ │  H1 标题                     │ │ ┌────────┐ │
│          │ │  正文段落...                  │ │ │ msg    │ │
│          │ │                             │ │ │ msg    │ │
│          │ │                             │ │ └────────┘ │
│          │ │                             │ │ [quick btns]│
│          │ └─────────────────────────────┘ │ [input    ]│
│          │   ← 可滚动区域 →                │ │           │
├──────────┴─────────────────────────────────┴────────────┤
│ StatusBar  ✓ 已保存 | 第 1/5 页 | 1,200 字 | [zoom ──○] │  ~26px
└──────────────────────────────────────────────────────────┘
```

- 大纲面板可折叠（`outline-panel.collapsed`）
- Agent 面板可拖拽调整宽度（`resize-handle-v`）

---

## 4. 状态依赖

| Store | 本页用途 |
|-------|---------|
| `useDocumentStore` | 文档路径、修改标记 → 标题栏；页码/字数 → 状态栏；zoom → ZoomControl |
| `useAgentStore` | 消息历史 → AgentMessages；loading → 发送按钮状态 |
| `useSettingsStore` | 暗色模式 → 全局 class；是否显示大纲面板 |
| `useAppStore` | 当前打开的模态框 / 弹窗 |

---

## 5. 键盘快捷键（全局）

| 快捷键 | 动作 |
|--------|------|
| `Cmd/Ctrl+K` | 唤起 CommandPalette |
| `Cmd/Ctrl+J` | Agent 续写（光标处） |
| `Cmd/Ctrl+F` | 唤起 FindReplaceDialog |
| `Cmd/Ctrl+S` | 保存文档 |
| `Cmd/Ctrl+Shift+F` | 全文校对 |
| `Escape` | 关闭当前弹窗 / 焦点回到编辑器 |

WorkspacePage 负责注册全局快捷键监听（`hooks/useKeyboard`），分发给对应 feature。

---

## 6. 页面生命周期

```
mount → 检查 autoSave 恢复 → focus editor
       → 注册全局快捷键
       → 注册 Tauri close 事件（未保存时拦截）

unmount → 注销快捷键
        → 注销事件监听
```

---

## 7. 多语言

| Key | 中文（默认） | English |
|-----|-------------|---------|
| `workspace.unsaved` | 未保存 | Unsaved |
| `workspace.saved` | 已保存 | Saved |
| `workspace.saving` | 保存中… | Saving… |
| `workspace.pages` | 页 | pages |
| `workspace.words` | 字 | words |
| `workspace.cursorAt` | 光标 | Cursor |

---

## 8. SettingsDrawer — 设置侧边面板

从 WorkspacePage 右侧滑出的设置面板，由 `useAppStore.settingsDrawerOpen` 控制。

- **唤起**: 菜单栏 "设置…"、状态栏底部 "未配置 API Key" 提示条
- **关闭**: 点击外部遮罩、[完成] 按钮、Escape
- **区域**: ApiKeySection → ModelSettings → EditorPreferences → DataManagement
- **首次启动**: 自动打开并定位到 ApiKeySection

> 详细设计见 [SettingsDrawer 文档](./settings-page.md)。
