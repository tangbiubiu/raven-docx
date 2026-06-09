# features/settings — 设置功能

> **对应 SRS**：F-150~153
> **架构变更 (v0.2.0)**：移除 LicenseSection（开源化），DangerZone 替代为 DataManagement
> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**：草案

---

## 1. 模块结构

```
features/settings/
├── components/
│   ├── ApiKeySection.tsx         # API Key 配置区域
│   ├── ModelSettings.tsx         # 模型设置区域
│   ├── EditorPreferences.tsx     # 编辑器偏好区域
│   └── DataManagement.tsx        # 数据管理区域
├── hooks/
│   └── useSettings.ts            # 设置读写 + 持久化
└── types.ts                      # ApiConfig, ModelConfig, EditorConfig
```

---

## 2. 组件契约

### ApiKeySection

```typescript
// 无 props，完全通过 useSettings hook 读写
// 结构：
//   - API 类型下拉 (openai-completions / openai-responses / anthropic)
//   - API Key 输入框（密码类型，可切换可见）
//   - Base URL 输入框（可选）
//   - 模型选择下拉
//   - "测试连接" 按钮 → 调用 pi_test_connection
```

### ModelSettings

```typescript
// 无 props
//   - Thinking/推理模式下拉 (auto / always / never)
//   - 流式输出 Toggle
```

### EditorPreferences

```typescript
// 无 props
//   - 暗色模式 Toggle
//   - 自动保存 Toggle
//   - 拼写检查 Toggle
//   - 默认字体大小下拉
```

### DataManagement — 数据管理区域

```typescript
// 无 props
//   - "清除对话历史" 按钮 → confirm → 删除 sessions/
//   - "清除草稿" 按钮 → confirm → 删除 autosave/
//   - "重置所有设置" 按钮 → confirm → 恢复默认值
//   - "退出应用" 按钮（macOS 上可选，菜单栏已有）
```

---

## 3. Hook 契约 — useSettings

```typescript
interface UseSettingsReturn {
  apiConfig: ApiConfig;
  modelConfig: ModelConfig;
  editorConfig: EditorConfig;

  // 写操作
  saveApiConfig(config: Partial<ApiConfig>): Promise<void>;
  saveModelConfig(config: Partial<ModelConfig>): void;
  saveEditorConfig(config: Partial<EditorConfig>): void;
  clearChatHistory(): Promise<void>;
  clearDrafts(): Promise<void>;
  resetAllSettings(): Promise<void>;
}

function useSettings(): UseSettingsReturn;
```

持久化策略：
| 配置 | 存储位置 |
|------|---------|
| `apiConfig` (不含 apiKey) | `localStorage` key `geex-docx:settings` |
| `apiConfig.apiKey` | 系统 Keychain（通过 Tauri command `set_api_key`） |
| `modelConfig` | `localStorage` 同上 |
| `editorConfig` | `localStorage` 同上 |

---

## 4. 契约文件 `types.ts`

```typescript
// features/settings/types.ts

interface ApiConfig {
  apiType: "openai-completions" | "openai-responses" | "anthropic";
  apiKey: string;         // 仅在内存中，不持久化到 localStorage
  baseUrl: string;
  model: string;
}

interface ModelConfig {
  thinking: "auto" | "always" | "never";
  streaming: boolean;
}

interface EditorConfig {
  darkMode: boolean;
  autoSave: boolean;
  spellcheck: boolean;
  defaultFontSize: number;
}
```

---

## 5. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useSettingsStore` | `setApiConfig()`, `setModelConfig()`, `setEditorConfig()` | 全部 |
| `useAppStore` | 无 | 无 |

---

## 6. Tauri 依赖

| 命令 | 用途 |
|------|------|
| `set_api_key(provider: string, key: string)` | 写入系统 Keychain |
| `get_api_key_masked(provider: string)` → `String` | 读取系统 Keychain (masked) |
| `delete_api_key(provider: string)` | 删除 Keychain 条目 |
| `pi_test_connection(config: ApiConfig)` → `bool` | 测试 LLM 连接 |

---

## 7. 多语言

已涵盖在 [SettingsDrawer 文档](../pages/settings-page.md) §10。