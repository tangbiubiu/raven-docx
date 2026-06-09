# geex-docx 数据持久化策略

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**: 草案 — 产品决策阶段
>
> **关联文档**：
> - [业务需求 (BRD)](../requirements/requirements-business.md)
> - [技术规格 (TSS)](../requirements/requirements-technical.md)

---

## 1. 数据分类

应用数据按性质分为四类：

| 类型 | 数据 | 存储位置 | 敏感度 | 持久化周期 |
|------|------|---------|--------|-----------|
| **文档内容** | .docx 文件字节 | 用户指定路径 | 用户私有 | 用户管理 |
| **应用状态** | 最近文件、窗口位置、用户偏好 | `$APP_DATA/state.json` | 低 | 跨会话 |
| **机密凭证** | API Key | 系统 Keychain / Credential Manager | 高 | 跨会话 |
| **会话数据** | Agent 对话历史、崩溃恢复草稿 | `$APP_DATA/sessions/` | 中 | 跨会话（可清理） |

---

## 2. 存储位置

```
# macOS
~/Library/Application Support/com.geex-docx.geex-docx/
├── state.json              # 应用状态（最近文件、偏好设置）
├── sessions/               # Agent 会话
│   └── <doc_hash>.jsonl    # 每文档一个会话记录
├── autosave/               # 崩溃恢复草稿
│   └── <doc_hash>.docx     # 自动保存的临时副本
└── pi-agent/               # pi agent 配置目录
    ├── auth.json            # Provider API Key（指向 Keychain）
    ├── models.json          # 模型配置
    └── settings.json        # pi agent 设置

# Windows
C:\Users\<user>\AppData\Roaming\com.geex-docx.geex-docx\
├── state.json
├── sessions/
├── autosave/
└── pi-agent/

# Linux
~/.local/share/com.geex-docx.geex-docx/
├── state.json
├── sessions/
├── autosave/
└── pi-agent/
```

---

## 3. 应用状态（state.json）

### 3.1 数据结构

```typescript
interface AppState {
  // 文档
  recentFiles: RecentFile[];    // 最近打开的文件列表（最多 20 条）
  lastDocumentPath?: string;    // 上次关闭时的文档路径

  // 窗口
  windowBounds?: {              // 窗口位置和大小
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sidebarWidth?: number;        // Agent 侧栏宽度
  outlineCollapsed?: boolean;   // 大纲面板折叠状态

  // 编辑器
  zoom?: number;                // 页面缩放（默认 100）
  showRuler?: boolean;          // 显示标尺（默认 true）

  // 主题
  theme?: 'light' | 'dark' | 'system';  // 主题模式（默认 system）
  language?: 'zh-CN' | 'en';            // 界面语言（默认 zh-CN）
}
```

### 3.2 读写策略

| 操作 | 策略 | 实现 |
|------|------|------|
| **写入** | 延迟批量写入，防抖 1s | Zustand `persist` middleware + Tauri `fs` plugin |
| **读取** | 应用启动时一次性读取 | `app_setup` 阶段 |
| **文件不存在** | 使用默认值，不报错 | `File::open().unwrap_or_default()` |
| **损坏/格式错误** | 降级到默认值，备份损坏文件 | 重命名为 `state.json.bak`，Toast 提示 |

---

## 4. 机密凭证（API Key）

### 4.1 安全原则

| 原则 | 实现 |
|------|------|
| **不落盘明文** | API Key 仅存储于系统 Keychain / Credential Manager |
| **不跨应用共享** | 使用独立 service name：`com.geex-docx.geex-docx.api-key.<provider>` |
| **前端不可见完整 Key** | 前端仅显示 Key 的前 4 位 + "..." + 后 4 位。完整 Key 仅 Rust 端持有 |
| **不通过 IPC 传输 Key** | Key 写入/读取均在 Rust 端完成，前端仅发送/接收 masked key |

### 4.2 pi agent 的 auth.json 处理

pi agent 需要 `auth.json` 来读取 API Key。

**推荐方案**：通过环境变量传递 API Key。

```bash
# Rust 端 spawn 时注入
PI_ANTHROPIC_KEY=<from_keychain> \
PI_OPENAI_KEY=<from_keychain> \
pi --mode rpc --agent-dir <app_data>/pi-agent [--session <doc_hash>]
```

优势：
- Key 仅存在于进程环境变量中，不落盘
- pi 崩溃/SIGKILL 时由操作系统自动清理环境变量
- 无竞态条件（auth.json 写入→pi 读取→删除 的序列不安全）

**fallback 方案**（若 pi agent 不支持环境变量注入）：
1. Rust 从 Keychain 读取 Key → 写入 `$APP_DATA/pi-agent/auth.json`
2. spawn pi → pi 读取 auth.json
3. 应用启动时清理残留 `auth.json`
4. 注册 atexit handler 在进程退出时删除 `auth.json`
5. 空闲超时时由超时逻辑确保 delete 执行

```json
{
  "providers": {
    "anthropic": { "api_key": "<from_keychain>" },
    "openai": { "api_key": "<from_keychain>" }
  }
}
```

---

## 5. 自动保存与崩溃恢复

### 5.1 自动保存策略

```
触发条件（任一满足）：
  A. 文档变更后闲置 5 秒（防抖）
  B. 每 60 秒（兜底定时）
  C. 应用失去焦点（窗口切换）
  D. 即将关闭（Tauri close_requested 事件）

操作：
  1. 通过 editorBridge.save() 获取 ArrayBuffer
  2. 写入原文件路径
  3. 写入 autosave 备份（$APP_DATA/autosave/<hash>.docx）
  4. 更新 isDirty = false
```

### 5.2 崩溃恢复

```
应用启动时：
  1. 检查 $APP_DATA/autosave/ 是否有草稿文件
  2. 检查草稿文件的修改时间 > 对应源文件的修改时间
  3. 若存在更新的草稿 → 弹出恢复提示
```

```
恢复提示 UI：
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 检测到未保存的草稿                                       │
│                                                             │
│  上次意外退出前，以下文档有未保存的修改：                      │
│                                                             │
│  📄 季度报告.docx — 修改于 2026-06-09 14:32                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  恢复草稿 │  │  忽略     │  │  查看差异 │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
│  恢复时，原始文件不会被覆盖（除非您手动保存）。                 │
└─────────────────────────────────────────────────────────────┘
```

**行为细节**：
- "恢复草稿"：用草稿内容替换编辑器内容，标记 `isDirty = true`（需手动保存）
- "忽略"：删除草稿文件，不恢复
- "查看差异"：Phase 4 功能，展示草稿和原文件的文本差异
- 多个草稿时列出全部，逐行显示
- 草稿恢复后自动删除 autosave 文件

### 5.3 草稿生命周期

```
创建：每次自动保存写入 autosave 目录
更新：同一文档的后续自动保存覆盖
删除：用户手动保存成功 → 删除草稿
保留：用户关闭文档（未保存）→ 保留草稿（供下次启动恢复）
```

---

## 6. Agent 会话数据

### 6.1 会话存储

| 项目 | 说明 |
|------|------|
| **粒度** | 每文档一个会话文件 |
| **格式** | JSONL（每行一个事件：`prompt` / `text_delta` / `tool_call` / `agent_end`） |
| **路径** | `$APP_DATA/sessions/<doc_hash>.jsonl` |
| **生命周期** | 文档打开 → pi 进程 spawn；文档关闭 → session 保留 |
| **清理** | 用户可选：Settings → "清除对话历史" |

### 6.2 会话恢复

下次打开同一文档时：
1. 检测 `sessions/<doc_hash>.jsonl` 是否存在
2. 若存在 → pi 启动带 `--session <doc_hash>` → Agent 可读取历史上下文
3. 前端渲染历史消息列表（最近 N 条）

---

## 7. 数据迁移

### 7.1 版本管理

`state.json` 包含 `version` 字段，用于检测数据格式变更：

```json
{
  "version": 1,
  "recentFiles": [...],
  ...
}
```

### 7.2 迁移策略

```
启动时：
  if state.version < CURRENT_VERSION:
    执行逐版本迁移函数
    写入更新后的 state.json (version = CURRENT_VERSION)
```

---

## 8. 数据清理

### 8.1 用户清理入口

SettingsDrawer → DataManagement：

| 操作 | 效果 |
|------|------|
| **清除对话历史** | 删除 `sessions/` 下所有文件 |
| **清除草稿** | 删除 `autosave/` 下所有文件 |
| **清除最近文件** | 清空 `state.json` 中的 `recentFiles` |
| **重置所有设置** | 删除 `state.json`，恢复默认值 |
| **清除所有数据** | 删除全部 `$APP_DATA`，退出应用 |

### 8.2 自动清理

- 草稿超过 30 天未恢复 → 自动删除
- 会话文件超过 90 天未访问 → 自动删除
