# 需求文档架构审视报告

> **审视人**: 架构师 (Architect Agent)
> **审视日期**: 2026-06-09
> **审视范围**: `.dev/requirements/` 全量 + `.dev/docs/` 全量模块文档
> **审视方法**: 交叉对比 BRD / FRS / TSS / full / module-docs / stores / infrastructure，标注矛盾、缺失、风险

---

## 一、审视总览

| 类别 | 数量 | 严重程度 |
|------|------|---------|
| 文档版本不一致 | 3 | 🔴 高 |
| 模块设计矛盾 | 4 | 🔴 高 |
| 功能范围冲突 | 2 | 🟡 中 |
| 架构设计漏洞 | 4 | 🟡 中 |
| 技术风险 | 3 | 🟡 中 |
| 文档清理缺失 | 2 | 🟢 低 |

---

## 二、文档版本不一致（3 项，🔴 高）

### 2.1 TSS 版本过旧，仍引用许可/激活系统

- **涉文件**: `.dev/requirements/requirements-technical.md`
- **现状**: 版本号 `v0.1.0-draft (2026-06-08)`，未同步 BRD v0.2.0 的开源化决策
- **具体残留**:
  - §1.4 安全性：`激活码离线验证，不强制要求联网（除非需在线校验）`
  - §1.4 安全性：`设备指纹单向哈希，不可逆，仅用于设备绑定校验`
  - §6 系统架构约束：`许可管理 | Tauri Rust 后端 (RSA 签名验证) | 激活码离线验证、设备指纹绑定、试用期本地管理`
- **影响**: 执行阶段若以 TSS 为准，将错误实现已废弃的许可模块
- **建议**: TSS 升级到 v0.2.0，删除许可相关所有内容，同步 BRD 的开源策略

### 2.2 requirements-full.md 版本过旧

- **涉文件**: `.dev/requirements/requirements-full.md`
- **现状**: 版本号 `v0.1.0-draft (2026-06-08)`，标注为 "完整备份 (All-in-One)"
- **具体残留**:
  - §3.2 范围内仍包含 `✅ 打印/打印预览`
  - §4.14 包含完整的许可与激活表（F-160~164），但 BRD v0.2.0 已删除
  - §9.1 验收标准包含 `激活码验证流程可正常完成`
  - 缺少 v0.2.0 的变更说明（开源化决策、单页面架构、无登录页）
- **影响**: 若有人直接读 full 版本而非拆分版，将获得错误的范围信息
- **建议**: 重新生成 full 版本，或加注废弃警告并指向拆分版的权威性

### 2.3 子文档版本号普遍未同步

- **涉文件**: `data-persistence.md`、`error-states.md`、`i18n-standards.md`、`stores.md`、`infrastructure.md`
- **现状**: 全部标注 `v0.1.0-draft`，但 module-split.md 已是 `v0.2.0-draft`
- **影响**: 读取这些文档时无法判断是否已考虑开源化后的变更
- **建议**: 全局 bump 到 v0.2.0-draft，并在每次架构决策后同步更新

---

## 三、模块设计矛盾（4 项，🔴 高）

### 3.1 useAppStore 仍使用 3 页面路由

- **涉文件**: `.dev/docs/modules/stores.md` §5
- **代码残留**:
  ```typescript
  type AppPage = "login" | "workspace" | "settings";
  // ...
  if (currentPage === "login") return <LoginPage />;
  if (currentPage === "settings") return <SettingsPage />;
  return <WorkspacePage />;
  ```
- **与现行设计矛盾**: BRD v0.2.0 和 module-split.md 明确 "单页面应用。WorkspacePage 为唯一路由"
- **建议**: 
  - 删除 `AppPage` 类型，改为 `AppView`（无路由概念）
  - Settings 作为 Drawer 从 WorkspacePage 内打开，由 `useAppStore.activeModal: "settings-drawer"` 控制
  - 移除 LoginPage 引用

### 3.2 useSettingsStore 仍有 licenseStatus

- **涉文件**: `.dev/docs/modules/stores.md` §4
- **代码残留**:
  ```typescript
  interface SettingsState {
    licenseStatus: LicenseStatus;
    setLicenseStatus(status: LicenseStatus): void;
    // ...
  }
  // 初始化中：
  // Tauri check_license() → setLicenseStatus
  ```
- **与现行设计矛盾**: BRD v0.2.0 明确 "开源软件，无许可/激活系统"
- **建议**: 从 SettingsState 删除 `licenseStatus` 和 `setLicenseStatus`

### 3.3 infrastructure.md 引用 SettingsPage

- **涉文件**: `.dev/docs/modules/infrastructure.md` §5（store 间通信规则）
- **代码残留**: `if (currentPage === "settings") return <SettingsPage />;`
- **影响**: 其实质是 stores.md 的重复引用，应随 stores.md 一起修正
- **建议**: 删去页面切换代码示例

### 3.4 页面层目录结构与单页面架构不一致

- **涉文件**: `.dev/docs/module-split.md` §2
- **现状**: `pages/` 下应只有 `WorkspacePage.tsx`
- **隐患文件**: `.dev/docs/modules/pages/login-page.md` 和 `.dev/docs/modules/pages/settings-page.md` 仍存在于文件树
- **建议**: 
  - 将 login-page.md 归档或标记为废弃
  - 将 settings-page.md 合并到 workspace-page.md 的 SettingsDrawer 章节

---

## 四、功能范围冲突（2 项，🟡 中）

### 4.1 打印功能归属不明

| 文档 | 打印状态 |
|------|---------|
| BRD v0.2.0 §3.2 (范围内) | 未列出 ❌ |
| FRS v0.2.0 表格 | F-145 打印，优先级 Should ✅ |
| requirements-full.md §3.2 | `✅ 打印/打印预览` ✅ |
| module-split.md features/ | 未分配任何 feature 给 F-145 ❓ |

- **影响**: 打印功能的实现与否没有明确决策，开发计划模糊
- **建议**: 产品决策确认打印是否进入 MVP。若不进入 → 从 FRS 删除 F-145；若进入 → 分配 feature 模块（`features/page-layout/` 或独立 `features/print/`），并标注复杂度（Tauri 端需处理 ProseMirror → HTML → 系统打印）

### 4.2 许可/激活系统残留引用

- **涉文件**: 
  - `requirements-full.md` §4.14（F-160~164）
  - `requirements-technical.md` §1.4, §6
- **现状**: BRD v0.2.0 已删除许可，但 FRS full 版本和 TSS 仍保留
- **影响**: 形成误导性参考文档
- **建议**: TSS 升级时一并清理

---

## 五、架构设计漏洞（4 项，🟡 中）

### 5.1 无文档打开时 Agent 进程如何管理

- **涉文件**: TSS §5.3 Session 管理
- **设计**: `--session <doc_hash>`，按文档 hash 绑定 session
- **漏洞**: BRD v0.2.0 "启动即进入 WorkspacePage"，此时尚无文档打开
  - pi 进程是否 spawn？若 spawn 但没有 `--session`，等价于无历史的新会话
  - 若 spawn，AgentSidebar 显示什么？"打开文档以开始"？
  - 若不 spawn（严格按"懒启动"），Cmd+K 命令面板如何处理？是否应该可用（如问通用问题）？
- **建议**: 定义两种 Agent 模式：
  - **文档模式**（有文档打开）：绑定 `--session <doc_hash>`，完整上下文注入
  - **自由模式**（无文档打开）：不传 `--session`，无文档上下文，仅通用对话。AgentSidebar 显示 "打开文档以启用完整 Agent 功能"

### 5.2 首次启动 API Key 配置流程未定义

- **涉文件**: BRD §3.1, error-states.md §2.3
- **场景**: 用户首次启动应用 → WorkspacePage 空白编辑器 → Agent 功能不可用
- **现有设计**: error-states.md 描述了底部非阻断提示条 "未配置 API Key — Agent 功能不可用 [配置…]"
- **漏洞**: 
  - Settings Drawer 默认是关闭还是打开？
  - 若关闭，用户如何发现 Agent 功能的存在？
  - 是否需要首次启动引导（onboarding flow）？
- **建议**: 
  - 首次启动时，Settings Drawer 自动打开并定位到 ApiKeySection
  - 或在编辑器空白区域显示引导卡片："配置 API Key 以启用 AI 功能 [开始配置]"
  - 此流程应作为 Phase 1 的显式任务

### 5.3 Agent 消息队列的 steer vs follow_up 前端语义不清晰

- **涉文件**: TSS §5.2 消息队列管理
- **设计**: Rust 端 `VecDeque<(Context, Mode)>`，其中 Mode 为 `steer` | `follow_up`
- **漏洞**: 
  - 前端何时选择 `steer` 何时选择 `follow_up`？
  - `agent_abort` + 新 prompt 是否自动转换为 `steer`？
  - 连续快速操作（润色 → 翻译 → 润色）的入队行为：前两个是否应该被 abort？
- **建议**: TSS 补充前端视角的状态转换表，明确：
  - 用户点击 "打断" → `invoke("agent_abort")` + `invoke("agent_send", { mode: "steer" })`
  - 用户连续发送多条 → Rust 端自动 `follow_up`，前端显示排队序号
  - 若用户在 Streaming 状态发送新指令但未点 "打断" → 默认 `follow_up`

### 5.4 auth.json 注入的安全时序问题

- **涉文件**: `data-persistence.md` §4.2, TSS §6
- **设计**: "pi 启动时由 Rust 端注入 Key 到 auth.json" → "关闭 pi 进程后删除"
- **漏洞**: 
  - 若 pi 进程被 SIGKILL（空闲超时）→ auth.json 中可能残留明文 Key
  - 应用崩溃时 auth.json 不会被清理
  - pi agent 启动后读取 auth.json → Rust 端是否等待确认再删除？不等待则有竞态
- **建议**: 
  - pi agent 启动参数支持通过环境变量传递 API Key：`PI_ANTHROPIC_KEY=xxx pi --mode rpc`，避免写临时文件
  - 若必须用 auth.json，在应用启动时清理残留文件、SIGKILL handler 注册清理逻辑
  - 文档补充：`auth.json` 清除策略和竞态条件分析

---

## 六、技术风险（3 项，🟡 中）

### 6.1 状态初始化顺序未处理依赖

- **涉文件**: `.dev/docs/modules/stores.md` §5
- **当前设计**:
  ```
  loadFromStorage()
    → localStorage → JSON.parse
    → Tauri read_api_key(apiType) → set apiKey
    → Tauri check_license() → setLicenseStatus  ← 已废弃
  ```
- **风险**: 
  - `read_api_key` 是 Tauri command，异步；若在 React render 前未完成 → `useSettingsStore.apiConfig` 为 null → Agent 组件出错
  - EditorBridge 初始化依赖 `useDocumentStore.document`，但文档可能异步加载
- **建议**: 
  - `useSettingsStore` 增加 `isLoaded: boolean` 标志
  - App shell 等待 `isLoaded === true` 再渲染 WorkspacePage
  - 或在 WorkspacePage 内统一 loading skeleton

### 6.2 超大文档性能策略只有 UI 提示没有架构方案

- **涉文件**: `error-states.md` §2.2, TODO.md
- **现状**: error-states 描述了警告对话框（"文件较大，可能影响性能"），但无后端/渲染层策略
- **风险**: 500 页文档打开→ ProseMirror 全量解析 + React 全量渲染 → 主线程卡死 10s+
- **建议**: 
  - TSS 补充"虚拟分页渲染"策略：仅渲染当前页 ± 2 页，其余懒加载
  - docx-editor-core 是否已支持按页分片解析？需确认
  - 若不支持，评估降级方案（转为纯文本模式？限制最大页数？）
  - 此项应作为 Phase 1 的架构决策，不能推到"后续优化"

### 6.3 Tauri Command 接口契约不完整

- **涉文件**: `.dev/docs/modules/tauri-commands.md`（未读取，可能不完整）
- **缺失的命令定义**:
  - `agent_send`: payload 结构（prompt 字符串？还是结构化 AIActionRequest？）
  - `agent_abort`: 参数（是否需要 mode: "steer" | "hard_abort"？）
  - `read_api_key(provider)`: 返回类型（完整 key 还是 masked？）
  - `write_api_key(provider, key)`: 参数校验
  - `test_api_key(provider)`: 返回类型和时间预算
  - `open_docx`: 参数（路径字符串？还是 Tauri 文件对话框自动弹出？）
  - `save_docx(path, buffer)`: buffer 如何通过 IPC 传递？大文件（>50MB）是否拆分？
- **建议**: 
  - 填充 `modules/tauri-commands.md`，为每个 command 明确签名、参数校验规则、错误类型、IPC 性能考量
  - 特别关注：ArrayBuffer 通过 tauri-specta 传递的性能（大文件场景）

---

## 七、文档清理缺失（2 项，🟢 低）

### 7.1 login-page.md 模块文档未归档

- **涉文件**: `.dev/docs/modules/pages/login-page.md`
- **现状**: BRD v0.2.0 明确 "无登录页"，但文档仍保留
- **建议**: 移动至 `.dev/archive/login-page.md` 或直接删除（Git 历史可追溯）

### 7.2 settings-page.md 应合并

- **涉文件**: `.dev/docs/modules/pages/settings-page.md`
- **现状**: Settings 已改为 Drawer 形式嵌入 WorkspacePage
- **建议**: 将 settings 相关内容合并到 `workspace-page.md` 的 "SettingsDrawer" 章节，原文件归档

---

## 八、正面发现（已做对的事）

为确保审视的平衡性，也记录架构中值得保留的设计：

| 发现 | 说明 |
|------|------|
| ✅ BRD v0.2.0 开源化决策执行彻底 | 范围外明确列出 "❌ 许可/激活系统（开源软件，无激活码）" 和 "❌ 用户注册/登录" |
| ✅ module-split.md 已同步到 v0.2.0 | 单页面架构、移除 license 模块，模块依赖图清晰 |
| ✅ error-states.md 设计优秀 | 错误分级 + 中文错误文案 + 可操作建议，覆盖 9 个边界场景 |
| ✅ i18n-standards.md 规范明确 | Key 命名规范 + 中英文风格指南 + 编辑器和应用 UI 分界清晰 |
| ✅ data-persistence.md 详尽 | 4 类数据 + 存储路径 + 崩溃恢复 + 草稿生命周期，无盲区 |
| ✅ Agent Session 按文档 hash 绑定 | 多文档会话隔离，不互相污染 |
| ✅ workspace-page.md 布局约束明确 | 精确到 px 的布局规格，Portal 浮层清单完整 |

---

## 九、修复优先级与行动计划

### 🔴 P0 — 阻塞开发（本周完成）

| # | 行动 | 涉文件 |
|---|------|--------|
| 1 | TSS 升级到 v0.2.0，删除许可/激活全部内容 | `requirements-technical.md` |
| 2 | stores.md 修复：删除 `licenseStatus`、修正 `AppPage` 为单页面 | `modules/stores.md` |
| 3 | infrastructure.md 删除页面切换代码示例 | `modules/infrastructure.md` |
| 4 | 归档 login-page.md、合并 settings-page.md | `modules/pages/` |

### 🟡 P1 — 架构完善（本周完成）

| # | 行动 | 涉文件 |
|---|------|--------|
| 5 | TSS 补充：无文档时的 Agent 行为定义（4.2 自由模式 vs 文档模式） | `requirements-technical.md` |
| 6 | TSS 补充：首次启动 API Key 配置引导流程 | `requirements-technical.md` |
| 7 | TSS 补充：steer vs follow_up 前端语义和状态转换表 | `requirements-technical.md` |
| 8 | data-persistence.md 补充：auth.json 竞态清除策略 | `data-persistence.md` |
| 9 | 确认打印功能是否进入 MVP，统一 BRD/FRS  | `requirements-business.md` / `requirements-functional.md` |

### 🟢 P2 — 持续改进（下周）

| # | 行动 | 涉文件 |
|---|------|--------|
| 10 | 填充 `modules/tauri-commands.md`，列出所有 command 的完整契约 | `modules/tauri-commands.md` |
| 11 | TSS 补充虚拟分页渲染策略（大文档性能方案） | `requirements-technical.md` |
| 12 | 重新生成 `requirements-full.md`（或标注废弃） | `requirements-full.md` |
| 13 | 全局 bump 所有 `v0.1.0-draft` 文档到 `v0.2.0-draft` | 全部子文档 |

---

## 十、关键决策待确认

以下问题需产品决策（非架构师单方决定）：

| # | 问题 | 选项 |
|---|------|------|
| Q1 | 打印功能是否进入 MVP？ | A) 不进入，从 FRS 删除 F-145；B) 进入，分配 `features/print/` |
| Q2 | 首次启动是否需要 onboarding 引导？ | A) 自动打开 Settings Drawer 到 ApiKeySection；B) 编辑器空白提示卡；C) 什么都不做，依赖底部非阻断条 |
| Q3 | 无文档时 AgentSidebar 显示什么？ | A) 可用（自由模式，无文档上下文）；B) 不可用（"打开文档以开始"）；C) 只显示 Agent 对话，隐藏命令面板 |
| Q4 | auth.json 残留风险处理优先级？ | A) 立即改环境变量方案；B) 先实现，Phase 2 优化；C) 接受风险，加清理逻辑 |

---

> 本报告将作为下次产品/架构会议的讨论基础。建议先修复 P0 项确保文档一致性，再推进 P1 架构完善。
