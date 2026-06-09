# SettingsDrawer — 设置侧边面板

> **来源**：`.dev/proto/settings.html`（仅视觉参考）
> **架构变更 (v0.2.0)**：从独立页面 `SettingsPage.tsx` 改为 WorkspacePage 内右侧滑出面板
> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**：草案

---

## 1. 职责

从 WorkspacePage 右侧滑出的设置面板，集中管理所有应用配置。

| 旧架构 | 新架构 |
|--------|--------|
| `pages/SettingsPage.tsx` 独立页面 | WorkspacePage 内 SettingsDrawer（右侧滑出 Panel） |
| `useAppStore.page === "settings"` 路由 | `useAppStore.settingsDrawerOpen` 控制 |
| 包含 LicenseSection | 删除，不涉及 |
| DangerZone → `setPage("login")` | DataManagement → `clearAllData()` 退出应用 |
| 返回按钮 `setPage("workspace")` | 关闭按钮 `toggleSettingsDrawer()` |

---

## 2. 组件结构

```typescript
// pages/WorkspacePage.tsx 内渲染
{settingsDrawerOpen && (
  <SettingsDrawer onClose={toggleSettingsDrawer} />
)}
```

```
SettingsDrawer
├── Overlay (点击外部关闭)
└── DrawerPanel (右侧滑出, 380px 宽)
    ├── DrawerHeader
    │   ├── "设置" 标题
    │   └── [完成] 按钮 → close
    └── ScrollArea
        ├── ApiKeySection            # API Key 配置
        ├── ModelSettings            # 模型设置 (thinking/streaming)
        ├── EditorPreferences        # 主题/语言/字号/自动保存
        └── DataManagement           # 清除对话历史/草稿/重置设置
```

---

## 3. 唤起方式

| 触发 | 行为 |
|------|------|
| 菜单栏 "设置…" | `toggleSettingsDrawer()` |
| 状态栏底部 "未配置 API Key" 提示条 | `toggleSettingsDrawer()` + 自动滚动到 ApiKeySection |
| 首次启动（isLoaded && !apiConfig.apiKey） | 自动打开 + 定位到 ApiKeySection |

---

## 4. 关闭方式

| 触发 | 行为 |
|------|------|
| 点击外部遮罩 (Overlay) | `toggleSettingsDrawer()` |
| [完成] 按钮 | `toggleSettingsDrawer()` |
| Escape 键 | `toggleSettingsDrawer()` |

---

## 5. 数据流

```
SettingsDrawer (编排)
    │
    ├── ApiKeySection ──▶ useSettingsStore.apiConfig
    │                     ├── apiType: "openai-completions" | "openai-responses" | "anthropic"
    │                     ├── apiKey: string (写入系统 Keychain，前端缓存)
    │                     ├── baseUrl: string
    │                     └── model: string
    │
    ├── ModelSettings ──▶ useSettingsStore.modelConfig
    │                     ├── thinking: "auto" | "always" | "never"
    │                     └── streaming: boolean
    │
    ├── EditorPreferences ──▶ useSettingsStore.editorConfig
    │                        ├── darkMode: boolean
    │                        ├── autoSave: boolean
    │                        ├── spellcheck: boolean
    │                        └── defaultFontSize: number
    │
    └── DataManagement ──▶ 直接调用 Tauri 命令
                          ├── 清除对话历史 → 删除 sessions/
                          ├── 清除草稿 → 删除 autosave/
                          └── 重置所有设置 → 恢复默认值 + 关闭应用
```

---

## 6. 契约文件

需要 `features/settings/types.ts`：

```typescript
// features/settings/types.ts

// ---- API Key 配置 ----
interface ApiConfig {
  apiType: "openai-completions" | "openai-responses" | "anthropic";
  apiKey: string;         // 仅在内存中，不持久化到 localStorage
  baseUrl: string;        // 可选，自定义 API 端点
  model: string;          // claude-sonnet-4 | gpt-4o | ...
}

// ---- 模型设置 ----
interface ModelConfig {
  thinking: "auto" | "always" | "never";
  streaming: boolean;
}

// ---- 编辑器偏好 ----
interface EditorConfig {
  darkMode: boolean;
  autoSave: boolean;
  spellcheck: boolean;
  defaultFontSize: number;   // 14 | 15 | 16 | 18
}
```

---

## 7. 交互行为

| 事件 | 行为 |
|------|------|
| API Key 输入 | 600ms 防抖 → 调用 `useSettingsStore.saveApiConfig()` |
| 连接测试 | 调用 `commands/pi_agent::pi_test_connection` → 显示状态 badge |
| 暗色模式 toggle | 即时切换 `html[data-theme]` + 写入 `useSettingsStore` |
| 清除对话历史 | confirm → 删除 `sessions/` 目录 |
| 清除草稿 | confirm → 删除 `autosave/` 目录 |
| 重置所有设置 | confirm → 清空所有 settings + 恢复默认值 + 退出应用 |

---

## 8. Tauri 依赖

| 命令 | 用途 |
|------|------|
| `pi_test_connection(config: ApiConfig)` | 测试 API 连接 |
| `set_api_key(provider: string, key: string)` | 写入系统 Keychain |
| `get_api_key_masked(provider: string)` → `String` | 读取 masked API Key |
| `delete_api_key(provider: string)` | 删除 Keychain 条目 |

---

## 9. 安全考虑

- **API Key** 不在 localStorage 明文存储，写入系统 Keychain
- 前端仅缓存 Key 的前后各 4 字符用于展示（如 `sk-a***b12c`）
- 连接测试请求不记录完整的 Key 到日志

---

## 10. 多语言

| Key | 中文（默认） | English |
|-----|-------------|---------|
| `settings.title` | 设置 | Settings |
| `settings.done` | 完成 | Done |
| `settings.apiConfig` | API Key 配置 | API Key Configuration |
| `settings.apiType` | API 类型 | API Type |
| `settings.apiKey` | API Key | API Key |
| `settings.baseUrl` | Base URL | Base URL |
| `settings.model` | 模型选择 | Model Selection |
| `settings.testConnection` | 测试连接 | Test Connection |
| `settings.testing` | 测试中… | Testing… |
| `settings.connectionSuccess` | ✓ 连接成功 | ✓ Connected |
| `settings.connectionFailed` | ✕ 连接失败 | ✕ Connection Failed |
| `settings.modelSettings` | 模型设置 | Model Settings |
| `settings.thinking` | 推理模式 | Thinking Mode |
| `settings.streaming` | 流式输出 | Streaming Output |
| `settings.editorPrefs` | 编辑器偏好 | Editor Preferences |
| `settings.darkMode` | 暗色模式 | Dark Mode |
| `settings.autoSave` | 自动保存 | Auto Save |
| `settings.spellcheck` | 拼写检查 | Spell Check |
| `settings.defaultFontSize` | 默认字体大小 | Default Font Size |
| `settings.dataManagement` | 数据管理 | Data Management |
| `settings.clearChatHistory` | 清除对话历史 | Clear Chat History |
| `settings.clearDrafts` | 清除草稿 | Clear Drafts |
| `settings.resetAll` | 重置所有设置 | Reset All Settings |
