# Raven 错误状态与边界场景交互设计

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**: 草案 — 产品决策阶段
>
> **关联文档**：
> - [业务需求 (BRD)](../requirements/requirements-business.md)
> - [技术规格 (TSS)](../requirements/requirements-technical.md)

---

## 1. 总则

### 设计原则

| 原则 | 说明 |
|------|------|
| **不崩溃** | 任何错误都不能导致应用崩溃。崩溃恢复机制兜底 |
| **不让用户猜** | 每个错误都有明确的中文说明 + 可操作的建议 |
| **区分可恢复/不可恢复** | 可恢复错误给操作入口（重试、跳过）；不可恢复错误给建议路径 |
| **Graceful Degradation** | Agent 不可用时，编辑器仍可正常工作（纯手动编辑） |
| **即时反馈** | 操作失败后 200ms 内出现视觉反馈 |

### 错误分级

| 级别 | 图标 | 交互 | 示例 |
|------|------|------|------|
| **信息** (Info) | ℹ️ | Toast 自动消失（3s） | "已保存"、"连接成功" |
| **警告** (Warning) | ⚠️ | Toast + 可关闭，或内联提示 | "API Key 未配置"、"文档未保存" |
| **错误** (Error) | ❌ | Toast 不自动消失 / 内联错误提示 | "文件打开失败"、"连接超时" |
| **致命** (Fatal) | 🔴 | 全屏错误页 + 操作按钮 | "文档损坏，无法解析" |

---

## 2. 场景设计

### 2.1 文档损坏

**触发条件**：用户尝试打开 .docx 文件，但 OOXML 解析失败（ZIP 损坏、格式不合法、Office 365 专有扩展等）

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 无法打开文档                                             │
│                                                             │
│  文件 "季度报告.docx" 可能已损坏或格式不受支持。              │
│                                                             │
│  原因: ZIP 解压失败 — 文件头损坏                              │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  选择其他文件     │  │  尝试修复         │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  尝试用 Microsoft Word 打开此文件，另存为新的 .docx 后再试。  │
└─────────────────────────────────────────────────────────────┘
```

**行为**：
- 显示全屏错误页（不替换编辑器内容，保留当前文档）
- 提供"选择其他文件"和"尝试修复"两个操作
- "尝试修复"：调用 docx-editor 的容错解析模式，跳过损坏片段
- 修复失败时给出明确的建议路径

### 2.2 超大文档

**触发条件**：文件大小超过 50MB 或页面数超过 500

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 大型文档                                                 │
│                                                             │
│  "年度报告.docx" 文件较大（82 MB，约 620 页）。              │
│  打开和编辑可能出现性能下降。                                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  仍然打开         │  │  取消             │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  □ 不再提示（本次会话）                                       │
└─────────────────────────────────────────────────────────────┘
```

**行为**：
- 打开前弹出警告确认对话框
- 打开后禁用某些高开销功能（如全文 Agent 校对），在工具栏给出提示
- 分段渲染，优先渲染当前页

### 2.3 Agent 不可用（未配置 API Key）

**触发条件**：用户触发 Agent 功能（Cmd+K/润色/翻译），但未配置任何 Provider 的 API Key

```
状态栏底部内联提示（非阻断）：
┌─────────────────────────────────────────────────────────────┐
│ ...                                                         │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ 未配置 API Key — Agent 功能不可用   [配置...]             │  ~32px 提示条
└─────────────────────────────────────────────────────────────┘

点击"配置..." → 打开 Settings Drawer，自动定位到 ApiKeySection
```

**行为**：
- Agent 按钮（Cmd+K、QuickActions）显示为禁用/半透明状态
- 底部出现非阻断提示条，带"配置…"入口
- 编辑器其他功能完全不受影响
- 首次启动无 API Key 时，编辑器正常可用（纯手动编辑模式）

**首次启动引导**（可选，Phase 2+）：
- 应用首次启动时，可在工具栏右侧显示轻量引导：`🔑 配置 API Key 以启用 AI 功能 [立即配置]`
- 不阻塞编辑器使用，用户可随时关闭

### 2.4 Provider 不可用（API Key 有效但服务不可达）

**触发条件**：Agent 请求发出后，LLM Provider 返回 5xx / 网络超时 / DNS 解析失败

```
┌─────────────────────────────────────────────────────────────┐
│  ❌ Agent 请求失败                                           │
│                                                             │
│  Anthropic API 无法访问（超时）。                             │
│                                                             │
│  错误码：HTTP 504 Gateway Timeout                            │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  重试             │  │  更换 Provider    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  检查网络连接或前往设置配置备用 Provider。                    │
└─────────────────────────────────────────────────────────────┘
```

**行为**：
- 弹出错误对话框，保持当前文档状态不变
- "重试"直接重发请求
- "更换 Provider" 打开 Settings Drawer → ApiKeySection
- 连续 3 次重试失败 → 建议用户检查网络 / 更换 Provider

### 2.5 Agent 流式输出中断

**触发条件**：流式输出过程中网络断开或 Provider 异常

```
AgentSidebar 消息中：
┌───────────────────────────────────────────────────────┐
│ [Agent 消息气泡]                                        │
│ 根据您的需求，我建议将这段文字修改为以下版本...          │
│ 新版本更加简洁，适合商务场景使用...                      │
│                                                        │
│ ████████████░░░░░░  (已生成 67%)                       │
│ ❌ 输出中断 — 网络连接已断开             [重试]          │
└───────────────────────────────────────────────────────┘
```

**行为**：
- 已生成的部分保留在对话框中
- 未完成部分显示中断标记 + 重试按钮
- 不自动重试（避免重复扣费）
- 用户可手动点"重试"继续

### 2.6 Agent 子进程崩溃

**触发条件**：pi 子进程异常退出

```
Toast 提示（顶部居中）：
┌───────────────────────────────────────────────────────┐
│ ⚠️ Agent 进程已恢复，请重试您的操作                         │
└───────────────────────────────────────────────────────┘
```

**行为**（已在 TSS §5 定义）：
- Rust 后端自动重启 pi 子进程（最多 3 次/分钟）
- 重启成功后通知前端
- 当前未完成的操作需用户手动重试
- 3 次重启均失败 → 显示致命错误，建议重启应用

### 2.7 保存失败（磁盘满 / 权限不足 / 文件被占用）

```
┌─────────────────────────────────────────────────────────────┐
│  ❌ 保存失败                                                 │
│                                                             │
│  无法写入 "季度报告.docx"。                                  │
│                                                             │
│  原因: 磁盘空间不足（剩余 12 MB，文件需要 8.5 MB）            │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  另存为…          │  │  关闭             │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  建议清理磁盘空间后重试。                                     │
└─────────────────────────────────────────────────────────────┘
```

**行为**：
- 弹出错误对话框
- "另存为…" 弹出系统文件对话框选新位置
- 不丢失编辑器中的修改内容
- 自动保存暂存到临时目录（见 §3 持久化策略）

### 2.8 粘贴格式不兼容

**触发条件**：从外部粘贴复杂 HTML/RTF 内容，格式无法完全映射到 OOXML

```
Toast 提示（底部居中，3s 自动消失）：
┌───────────────────────────────────────────────────────┐
│ ⚠️ 部分格式已简化 — 源内容的复杂表格/自定义样式可能丢失    │
└───────────────────────────────────────────────────────┘
```

**行为**：
- 尽力保留格式（docx-editor 内置的 HTML→OOXML 转换）
- 丢失格式时给出 Toast 提示（不打断操作）
- 保留原始文本内容，仅格式降级

### 2.9 字体缺失

**触发条件**：打开的 docx 引用系统未安装的字体

```
首次打开文档时的非阻断提示：
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ 缺少字体：Times New Roman, 华文楷体                        │
│                                                             │
│ 已使用替代字体渲染。保存时不会修改原始字体设置。               │
│ 如需安装缺失字体，请通过系统安装。                            │
│                                             [不再提示] [确定]│
└─────────────────────────────────────────────────────────────┘
```

**行为**：
- 文档正常打开，使用 fallback 字体渲染
- 弹出一次性提示（可勾选"不再提示"）
- 保存时保留原始字体引用，不替换为 fallback

---

## 3. 全局错误处理架构

```
┌─ UI 层 ─────────────────────────────────────────────────┐
│                                                         │
│  Toast 系统          Dialog 系统       Inline 提示       │
│  (info/warn/error)   (confirm/error)   (form field/bar) │
│        ▲                  ▲                 ▲           │
│        │                  │                 │           │
│  ┌─────┴──────────────────┴─────────────────┴─────┐     │
│  │            ErrorBoundary（兜底）                 │     │
│  │           全屏错误页 + 重试/反馈                    │     │
│  └───────────────────────────────────────────────┘     │
│                         ▲                               │
├─────────────────────────┼───────────────────────────────┤
│  Store / Hook 层        │                               │
│  useTauriCommand.ts ────┘  (统一 Tauri Error → UI 映射)  │
├──────────────────────────────────────────────────────────┤
│  Rust 后端                                               │
│  Result<T, String> → 前端解析错误信息                     │
│  (未来: AppError 枚举，见 TSS 修订)                       │
└──────────────────────────────────────────────────────────┘
```

---

## 4. i18n Key 清单（错误相关）

| Key | 中文（默认） | English |
|-----|-------------|---------|
| `error.title` | 出错了 | Something went wrong |
| `error.retry` | 重试 | Retry |
| `error.cancel` | 取消 | Cancel |
| `error.close` | 关闭 | Close |
| `error.tryAgain` | 请重试 | Try again |
| `error.docCorrupted` | 无法打开文档 | Cannot open document |
| `error.docCorruptedDesc` | 文件 "{name}" 可能已损坏或格式不受支持 | File "{name}" may be corrupted or unsupported |
| `error.docCorruptedAction` | 尝试用 Microsoft Word 打开此文件，另存为新的 .docx 后再试 | Try opening with Microsoft Word and save as a new .docx |
| `error.largeDocWarning` | 文件 "{name}" 较大（{size}，约 {pages} 页），可能影响性能 | "{name}" is large ({size}, ~{pages} pages). Performance may be affected |
| `error.largeDocOpenAnyway` | 仍然打开 | Open Anyway |
| `error.agentNotConfigured` | 未配置 API Key — Agent 功能不可用 | API Key not configured — Agent features unavailable |
| `error.agentNotConfiguredAction` | 配置… | Configure… |
| `error.agentFailed` | Agent 请求失败 | Agent request failed |
| `error.agentFailedDesc` | {provider} API 无法访问（{reason}） | {provider} API unreachable ({reason}) |
| `error.agentFailedRetry` | 重试 | Retry |
| `error.agentFailedChangeProvider` | 更换 Provider | Change Provider |
| `error.agentStreamInterrupted` | 输出中断 — {reason} | Output interrupted — {reason} |
| `error.agentCrashed` | Agent 进程已恢复，请重试您的操作 | Agent process recovered, please retry |
| `error.saveFailed` | 保存失败 | Save failed |
| `error.saveFailedDesc` | 无法写入 "{name}" | Cannot write "{name}" |
| `error.saveFailedDiskFull` | 磁盘空间不足（剩余 {free}，文件需要 {need}） | Disk full ({free} free, {need} needed) |
| `error.saveFailedPermission` | 权限不足 | Permission denied |
| `error.saveFailedInUse` | 文件被其他程序占用 | File is in use by another program |
| `error.saveAsAction` | 另存为… | Save As… |
| `error.pasteFormatLoss` | 部分格式已简化 — 源内容的复杂格式可能丢失 | Some formatting simplified — complex formatting may be lost |
| `error.fontMissing` | 缺少字体：{fonts} | Missing fonts: {fonts} |
| `error.fontMissingDesc` | 已使用替代字体渲染。保存时不会修改原始字体设置 | Substituted fonts used for display. Original font settings preserved |
| `error.fontMissingDismiss` | 不再提示 | Don't show again |
| `error.tryFix` | 尝试修复 | Try to Repair |
| `error.chooseOther` | 选择其他文件 | Choose Another File |
| `error.unknown` | 发生未知错误 | An unknown error occurred |
