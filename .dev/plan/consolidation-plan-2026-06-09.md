# geex-docx 文档修复方案 — v0.2.0 一致性治理

> **版本**: v0.2.0
> **日期**: 2026-06-09
> **基于**: [产品审阅纪要](../meeting/requirements-review-2026-06-09.md) + [架构审视报告](../meeting/architecture-review-2026-06-09.md)
> **目标**: Phase 1 代码开工前所有设计文档达到一致、可执行状态

---

## 一、执行摘要

两份审阅共发现 **33 处问题**（去重后 **20 处唯一问题**），根源是 v0.2.0 三大架构决策未完全传播到所有子文档：

1. **开源化**（无许可/激活）→ `stores.md`、`tauri-commands.md`、`features/settings.md`、`TSS` 等 8 个文件残留 license 相关内容
2. **单页面**（无路由）→ `stores.md`、`infrastructure.md`、`pages/settings-page.md`、`pages/login-page.md` 仍使用三页面路由
3. **品牌统一**（geex-docx）→ 5 个文件仍有旧名 `agentwrite`

本方案定义了 **16 项修复行动**，按 P0/P1/P2 优先级排列，预计总工时约 **12 小时**。

---

## 二、修复范围总览

```
涉改文件 ─ 19 个
├── 🔴 P0 阻塞  (6 个文件, ~4h)  ─ Phase 1 开工前必须完成
├── 🟡 P1 本周  (9 个文件, ~4h)  ─ Phase 1 进行中完成
└── 🟢 P2 下周  (4 个文件, ~2h)  ─ Phase 2 开始前完成
```

### 文件变更矩阵

| 文件 | P0 | P1 | P2 | 变更摘要 |
|------|:--:|:--:|:--:|---------|
| `.dev/docs/modules/stores.md` | ● | | | 删除 AppPage/licenseStatus，重定义为单页面 |
| `.dev/docs/modules/tauri-commands.md` | ● | ● | | 删除 §4 license 整节 + 更新 collect_commands!；A7b 补全命令契约 |
| `.dev/docs/modules/pages/login-page.md` | ● | | | 添加废弃标记 |
| `.dev/docs/modules/pages/settings-page.md` | ● | | | 重写为 SettingsDrawer |
| `.dev/docs/modules/features/settings.md` | ● | | | 删除 LicenseSection/DangerZone→login |
| `.dev/proto/login.html` | ● | | | 删除 |
| `.dev/requirements/requirements-technical.md` | | ● | | 清理 license 残留，升级 v0.2.0 |
| `.dev/requirements/requirements-full.md` | | ● | | 重新生成或标记废弃 |
| `.dev/requirements/requirements-business.md` | | ● | | 与 Phase 计划对齐 |
| `.dev/docs/modules/infrastructure.md` | | ● | | 删除页面切换代码示例 |
| `.dev/docs/modules/features/document.md` | | ● | | 替换 agentwrite → geex-docx |
| `.dev/docs/modules/features/agent.md` | | | ● | (无变更，仅审阅确认) |
| `.dev/docs/modules/pages/workspace-page.md` | | ● | | 补充 SettingsDrawer 章节 |
| `.dev/docs/data-persistence.md` | | ● | | 升级 v0.2.0，auth.json 环境变量方案 |
| `.dev/docs/error-states.md` | | | ● | 升级 v0.2.0 |
| `.dev/docs/i18n-standards.md` | | | ● | 升级 v0.2.0 |
| `.dev/docs/module-split.md` | | | ● | 升级 v0.2.0，统一 Phase 命名 |
| `.dev/docs/modules/*.md` (余下 10 个) | | | ● | 全局 bump v0.2.0-draft |
| `.dev/TODO.md` | | ● | | 更新待办（去掉已解决项） |

---

## 三、P0 修复行动 — 阻塞开发（~4h）

### A1. 重写 stores.md — 单页面 + 去 license

**文件**: `.dev/docs/modules/stores.md`

**变更**:

1. **删除 `AppPage` 类型**（L172），替换为：

```typescript
// useAppStore — 应用级 UI 状态（单页面架构）
//
// ⚠️ 持久化说明：outlinePanelCollapsed / agentSidebarOpen 需跨会话持久化（见 data-persistence.md §3.1）。
// 方案 A：将这两个字段放在 useSettingsStore.editorConfig 中（利用 SettingsStore 已有的 persist 机制）
// 方案 B：useAppStore 单独加 Zustand persist middleware 绑定 Tauri fs
// 以下 interfaces 按方案 B 编写，实施前确认最终选择。

interface AppState {
  // 浮层栈（全局 Portal）
  activeModal: "commandPalette" | "findReplace" | "pageSetup" | "hyperlink" | "insertTable" | null;
  
  // 侧边面板
  settingsDrawerOpen: boolean;
  agentSidebarOpen: boolean;     // 需持久化
  outlinePanelCollapsed: boolean; // 需持久化

  // 加载
  isInitialLoading: boolean;

  // Actions
  openModal(id: string): void;
  closeModal(): void;
  toggleSettingsDrawer(): void;
  toggleAgentSidebar(): void;
  toggleOutlinePanel(): void;
  setInitialLoading(loading: boolean): void;
}
```

2. **删除 `useSettingsStore` 中 `licenseStatus` 字段**（L138-143）：
```diff
-  licenseStatus: LicenseStatus;
-  setLicenseStatus(status: LicenseStatus): void;
```

3. **删除初始化中的 license 调用**（L162）：
```diff
-  → Tauri check_license() → setLicenseStatus
```

4. **删除页面切换代码示例**（L196-199）。

5. **增加 `isLoaded` 标志**（解决架构师 6.1）：

```typescript
interface SettingsState {
  isLoaded: boolean;        // 异步加载完成标记
  // ...
  loadFromStorage(): Promise<void>;  // 完成后设置 isLoaded = true
}
```

---

### A2. 删除 tauri-commands.md §4 license 整节

**文件**: `.dev/docs/modules/tauri-commands.md`

**变更**:

1. **删除线路图**（L15, L21-22）：
```diff
- ├── license.rs       # 许可与激活
- ├── license/
- │   └── mod.rs       # RSA 签名验证逻辑模块
```

2. **删除 `mod.rs` 引用**（L37）：
```diff
- pub mod license;
```

3. **更新 `collect_commands!`**（L41-57），删除三条 license 命令：
```diff
-     commands::license::activate_license,
-     commands::license::check_license,
-     commands::license::get_device_fingerprint,
```

4. **删除 §4 整节**（L214-320）：`commands/license.rs`、`license/` 子模块、`LicenseStatus` 结构体。

5. **更新安全注意事项表**（L318-320），删除：
```diff
- | `activate_license` | 离线签名验证，公钥硬编码在二进制中 |
```

---

### A3. 标记 login-page.md 废弃

**文件**: `.dev/docs/modules/pages/login-page.md`

**变更**: 在 YAML frontmatter 后、标题前插入废弃标记：

```markdown
# LoginPage — 登录/注册页

> ⚠️ **已废弃 (v0.2.0)**
> 开源化决策后，用户注册/登录功能已移除。
> 此文档仅保留作为历史参考，不再维护。
> 新的入口流程见 [WorkspacePage §SettingsDrawer](./workspace-page.md)。
```

---

### A4. 重写 settings-page.md → SettingsDrawer

**文件**: `.dev/docs/modules/pages/settings-page.md`

**变更**: 全文重写。核心变化：

| 旧 | 新 |
|----|----|
| `pages/SettingsPage.tsx` 独立页面 | WorkspacePage 内 SettingsDrawer（右侧滑出 Panel） |
| `useAppStore.page === "settings"` 路由 | `useAppStore.settingsDrawerOpen` 控制 |
| 包含 LicenseSection | 删除，不涉及 |
| DangerZone → `setPage("login")` | DataManagement → `clearAllData()` 退出应用 |
| 返回按钮 `setPage("workspace")` | 关闭按钮 `toggleSettingsDrawer()` |

**新结构**:
```
WorkspacePage 内 SettingsDrawer
├── DrawerHeader ("设置" + [完成] 按钮)
├── ScrollArea
│   ├── ApiKeySection            # API Key 配置
│   ├── ModelSettings            # 模型设置 (thinking/streaming)
│   ├── EditorPreferences        # 主题/语言/字号/自动保存
│   └── DataManagement           # 清除对话历史/草稿/重置设置
└── Overlay (点击外部关闭)
```

**删除的区域**（i18n 同步清理）:
- ❌ LicenseSection 整节
- ❌ DangerZone → login 逻辑
- ❌ settings.license.* 所有 i18n key

---

### A5. 重写 features/settings.md — 去 License

**文件**: `.dev/docs/modules/features/settings.md`

**变更**:

1. **更新组件结构**（§1）：
```diff
- │   ├── LicenseSection.tsx
- │   └── DangerZone.tsx
+ │   └── DataManagement.tsx
```

2. **删除 LicenseSection 组件契约**（§2），替换为 DataManagement：

```typescript
// DataManagement — 数据管理区域
// 无 props
//   - "清除对话历史" 按钮 → confirm → 删除 sessions/
//   - "清除草稿" 按钮 → confirm → 删除 autosave/  
//   - "重置所有设置" 按钮 → confirm → 恢复默认值
//   - "退出应用" 按钮（macOS 上可选，菜单栏已有）
```

3. **更新 `useSettings` hook 契约**（§3）：
```diff
- activateLicense(code: string): Promise<boolean>;
- resetAllSettings(): void;
- clearAllData(): void;
+ clearChatHistory(): Promise<void>;
+ clearDrafts(): Promise<void>;
+ resetAllSettings(): Promise<void>;
```

4. **删除 `licenseStatus` 字段**（§3）：
```diff
- licenseStatus: LicenseStatus;
```

5. **删除 `types.ts` 中的 `LicenseStatus`**（§4）。

6. **更新 Tauri 依赖表**（§6）：
```diff
- | `activate_license(code: string)` | 激活码验证 |
- | `check_license()` → `LicenseStatus` | 许可状态查询 |
```

7. **更新状态依赖**（§5）：
```diff
- | `useAppStore` | `setPage("login")` | 无 |
```

---

### A6. 删除 login.html 原型

**文件**: `.dev/proto/login.html`

**变更**: 直接删除。Git 历史可追溯。

```bash
rm .dev/proto/login.html
```

---

## 四、P1 修复行动 — 本周完成（~6h）

> 共 8 项：A7 ~ A13（含新增 A7b Tauri command 契约补全）

### A7. 清理 TSS 中 license 残留 + 升级 v0.2.0 + 补充 Agent 交互协议

**文件**: `.dev/requirements/requirements-technical.md`

**变更**:

1. **升级版本号**:
```diff
- > **版本**: v0.1.0-draft
- > **最后更新**: 2026-06-08
+ > **版本**: v0.2.0-draft
+ > **最后更新**: 2026-06-09
```

2. **删除 §1.4 安全性中的激活码行** (L46-47):
```diff
- - 激活码离线验证，不强制要求联网（除非需在线校验）
- - 设备指纹单向哈希，不可逆，仅用于设备绑定校验
```

3. **删除 §6 架构约束表中的许可管理行** (L70):
```diff
- | 许可管理 | Tauri Rust 后端 (RSA 签名验证) | 激活码离线验证、设备指纹绑定、试用期本地管理 |
```

4. **补充 Agent 上下文注入分级策略**（解决产品 M3）:

```markdown
#### 4.4.1 上下文注入分级（MVP 策略）

| 操作类型 | 注入内容 | 预估 tokens | 适用场景 |
|---------|---------|------------|---------|
| **短选区** (≤500字) | 选区 + 前后 200 字符 + 格式信息 | ~800 | 润色/翻译/扩写/解释/风格转换 |
| **全文概述** | 标题大纲 + 段落数/字数/样式列表 + AgentCommand schema | ~1500 | 摘要/续写/排版优化 |
| **全文校对** | 按节分页注入（每 2000 字一批 + 格式） | ~3000/批 | 全文校对（分批） |

> ⚠️ **已知限制 (MVP)**：全文校对分批注入可能丢失跨节上下文。
> 未来方案：pi extension 注册 `get_page_content(n)` / `search_document(q)` 工具，Agent 按需拉取。
```

5. **补充 Agent 状态机缺失状态**（解决产品 N5）:

```diff
 状态机：
 
+              [NotInstalled]
+                   │
+              install pi
+                   ▼
                spawn (懒启动)
   [Stopped] ───────────────────▶ [Idle]
      ▲                               │
      │ shutdown                 prompt│
      │                               ▼
+     │                          [Streaming]
-     │                          [Streaming]
      │                           │        │
      │                      steer│   crash│
      │                           ▼        ▼
      │                         [Idle]  [Dead]
      │                                    │
      └────── auto-restart (最多 3 次) ────┘

+ [NotInstalled]：pi 二进制未找到 → 显示下载引导
+ [ShuttingDown]：SIGTERM → 等 3s → SIGKILL → 释放 auth.json
```

6. **补充无文档时 Agent 行为定义**（解决架构师 5.1）:

```markdown
#### 4.4.x 两种 Agent 模式

| 模式 | 触发条件 | --session | 可用操作 | AgentSidebar 文案 |
|------|---------|-----------|---------|------------------|
| **自由模式** | 无文档打开 | 无 | 通用问答、系统帮助 | "打开文档以启用完整 Agent 功能" |
| **文档模式** | 有文档打开 | `--session <doc_hash>` | 全部 Agent 能力 | 正常交互界面 |

自由模式下：
- AgentSidebar 仍可打开（显示为只读问答模式）
- Cmd+K 命令面板可唤起，但文档操作类命令置灰
- QuickActions 中的续写/润色/翻译/扩写均禁用
```

7. **补充首次启动 API Key 引导流程**（解决架构师 5.2）:

8. **补充前端消息发送模式**（解决架构师 5.3 — steer vs follow_up 前端语义）:

```markdown
#### 4.4.y 前端消息发送模式

pi RPC 子进程一次只能处理一个 prompt。前端通过 `agent_send` 命令的 `mode` 参数控制发送行为：

| mode | 行为 | 触发场景 |
|------|------|---------|
| `"default"` | 若 Idle → 直接发送；若 Streaming → 自动入队（follow_up） | 用户正常发送指令 |
| `"steer"` | 中断当前 turn（tool_call 完成后注入新指令），清空 pending 队列 | 用户点击「打断」按钮后发送新指令 |
| `"enqueue"` | 无论当前状态，始终入队等待 | 批量操作管道（润色 → 翻译 → 校对） |

**用户操作 → mode 映射**：

| 用户操作 | mode | UI 反馈 |
|---------|------|---------|
| 发送新指令（Agent 空闲） | `"default"` | 直接开始输出 |
| 发送新指令（Agent 忙碌，未点打断） | `"default"` → 后端自动入队 | 显示「排队中 (#N)」 |
| 点击「打断」+ 发送新指令 | `"steer"` | 终止当前动画，立即开始新输出 |
| 连续操作管道（如：润色 → 翻译 → 润色） | `"enqueue"` ×3 | 依次显示「排队中 (#1)」「(#2)」「(#3)」 |

> ⚠️ `"enqueue"` vs `"default"` 的差异：`"enqueue"` 不会因当前 turn 结束而自动清空队列。当用户预期是管道操作时使用 `"enqueue"`，
> 避免前一步完成后的 `agent_end` 导致后续指令被意外丢弃。
```

9. **补充首次启动 API Key 引导流程**（解决架构师 5.2）:

```markdown
#### 首次启动引导

Phase 1 实现：首次启动时 SettingsDrawer 自动打开并定位到 `ApiKeySection`。
后续 Phase 可在编辑器空白区域添加引导卡片。

检测逻辑：`useSettingsStore.isLoaded && !apiConfig.apiKey` → autoOpen = true（仅一次）。
```

---

### A7b. 补全 Tauri Command 接口契约（P1 新增）

**文件**: `.dev/docs/modules/tauri-commands.md`

**背景**: 架构审视报告 §6.3 发现 7 个 command 的 payload 结构、参数校验、错误类型缺失。
Phase 3 前后端对接前契约必须定稿。

**变更**: 在 A2（删除 license 整节）的基础上，补充以下 command 的完整定义：

```rust
// Phase 1-2 涉及的 4 个 command（P1 完成）

/// 打开 .docx 文件
/// 路径由 Tauri 文件对话框选择，Rust 端做路径沙箱校验
#[tauri::command]
#[specta::specta]
async fn open_docx(path: String) -> Result<Vec<u8>, String> {
    // 校验：路径必须在用户允许的范围内（Tauri capability）
    // 返回：完整 OOXML 字节（前端负责传给 docx-editor 解析）
    // 错误：文件不存在、权限不足、非 ZIP/OOXML 格式
}

/// 保存文档到原路径
#[tauri::command]
#[specta::specta]
async fn save_docx(path: String, buffer: Vec<u8>) -> Result<(), String> {
    // 校验：路径可写、buffer 非空
    // 副作用：同时写入 autosave 备份
    // 错误：磁盘满、权限不足、文件被占用
}

/// 从系统 Keychain 读取 API Key（返回 masked）
#[tauri::command]
#[specta::specta]
async fn get_api_key_masked(provider: String) -> Result<String, String> {
    // 校验：provider ∈ ["anthropic", "openai", "openai-compatible"]
    // 返回：前 4 位 + "..." + 后 4 位；未配置时返回空字符串
}

/// 写入 API Key 到系统 Keychain（前端传完整 Key）
#[tauri::command]
#[specta::specta]
async fn set_api_key(provider: String, key: String) -> Result<(), String> {
    // 校验：provider 白名单、key 非空
    // 副作用：更新 pi-agent/auth.json（若进程运行中）
    // 错误：Keychain 写入失败
}
```

```rust
// Phase 3 涉及的 3 个 command（P1 定义签名，P3 实现）

/// 发送 prompt 给 pi agent
#[tauri::command]
#[specta::specta]
async fn agent_send(
    prompt: String,                          // 完整 prompt（含上下文注入）
    mode: Option<String>,                    // "default" | "steer" | "enqueue"
    session_id: Option<String>,              // 文档 hash（无文档时省略）
) -> Result<String, String> {               // 返回消息 ID
    // 校验：prompt 非空、prompt ≤ 100KB（防止超大注入）
    // 行为：见 A7 §4.4.y 前端消息发送模式
    // 事件流：pi:text_delta / pi:tool_call / pi:agent_end / pi:error
    // 错误：pi 未安装、进程崩溃、Provider 不可用
}

/// 中止当前 Agent 操作
#[tauri::command]
#[specta::specta]
async fn agent_abort() -> Result<(), String> {
    // 行为：发送 abort 到 pi stdin；清空 pending 队列
    // 注意：不 kill 进程，仅中止当前 turn
}

/// 获取 Agent 进程状态
#[tauri::command]
#[specta::specta]
async fn agent_get_status() -> Result<AgentStatus, String> {
    // 返回：NotInstalled | Idle | Streaming | Dead | ShuttingDown
}

struct AgentStatus {
    state: String,           // 当前状态
    pending_count: u32,      // 队列中待处理消息数
    session_id: Option<String>,
}
```

**涉及文件行**: 全文件补充命令定义表、参数校验规则、错误类型枚举、IPC 性能考量（大文件 buffer 传输）。

---

### A8. 处理 requirements-full.md

**文件**: `.dev/requirements/requirements-full.md`

**方案**: **直接删除**。拆分后的 BRD/FRS/TSS 已是权威来源。

```bash
rm .dev/requirements/requirements-full.md
```

并在 BRD 文档的 "相关文档" 节中移除对 full.md 的引用。

---

### A9. 统一迭代计划命名

**文件**: `.dev/requirements/requirements-business.md` §5 + `.dev/docs/module-split.md` §6

**变更**: 在 BRD §5 增加 Phase 映射表。

> ⚠️ **版本号体系变更**：本文档定义的 Phase 计划替代 BRD §10 原来的 v0.1.0 → v0.2.0 → v0.3.0 → v1.0.0 版本序列。
> Phase 1-3 合计约等于原计划的 v0.1.0（MVP），Phase 4 约等于 v1.0.0（正式发布）。
> BRD §10 的版本号保留作为发布标签参考，但开发编排以本 Phase 表为准。

```markdown
### 迭代计划

| Phase (开发) | 版本 (发布) | 主题 | 核心交付 |
|-------------|------------|------|---------|
| Phase 1 | — | 骨架搭建 | 单页面布局、stores、API Key 配置 |
| Phase 2 | — | 编辑器核心 | DocxEditor 集成、打开/保存、格式化 |
| Phase 3 | v0.1.0-beta | Agent 集成 | 命令面板、对话侧栏、pi 通信 |
| Phase 4 | v1.0.0 | 完善 | 表格/页面布局/审阅/崩溃恢复 |
```

同时在 module-split.md §6 增加对应的版本标记。

---

### A10. 删除 infrastructure.md 中页面切换代码

**文件**: `.dev/docs/modules/infrastructure.md`

**变更**: 删除 §5（Store 间通信规则）中的页面切换代码示例（L196-198）：

```diff
- // app/AppShell.tsx
- const currentPage = useAppStore(s => s.currentPage);
- if (currentPage === "login") return <LoginPage />;
- if (currentPage === "settings") return <SettingsPage />;
- return <WorkspacePage />;
```

---

### A11. 补充 workspace-page.md 的 SettingsDrawer 章节

**文件**: `.dev/docs/modules/pages/workspace-page.md`

**变更**: 在 §2 组件结构中的全局浮层部分，补充 SettingsDrawer：

```diff
 全局浮层（Portal）：
 ├── CommandPalette                  (features/agent/components/CommandPalette)
 ├── SuggestionPopover               (features/agent/components/SuggestionPopover)
+├── SettingsDrawer                  (features/settings/components/SettingsDrawer)
 ├── FindReplaceDialog               (features/find-replace/components/FindReplaceDialog)
```

并在文档底部新增 §8 SettingsDrawer 章节：

```markdown
## 8. SettingsDrawer — 设置侧边面板

从 WorkspacePage 右侧滑出的设置面板，由 `useAppStore.settingsDrawerOpen` 控制。

- **唤起**: 菜单栏 "设置…"、状态栏底部 "未配置 API Key" 提示条
- **关闭**: 点击外部遮罩、[完成] 按钮、Escape
- **区域**: ApiKeySection → ModelSettings → EditorPreferences → DataManagement
- **首次启动**: 自动打开并定位到 ApiKeySection
```

---

### A12. 全局替换 agentwrite → geex-docx

**涉及文件**（逐文件 in-place 替换）:

| 文件 | 行 | 旧值 | 新值 |
|------|-----|------|------|
| `document.md:97` | L97 | `agentwrite:recent-files` | `geex-docx:recent-files` |
| `settings.md:101` | L101 | `agentwrite:settings` | `geex-docx:settings` |
| `stores.md:159` | L159 | `agentwrite:settings` | `geex-docx:settings` |

注意：`login-page.md` 中的 "AgentWrite" 因文件已废弃，不需要修改。

---

### A13. 升级 data-persistence.md 到 v0.2.0 + auth.json 安全增强

**文件**: `.dev/docs/data-persistence.md`

**变更**:

1. **升级版本号**:
```diff
- > **版本**: v0.1.0-draft
+ > **版本**: v0.2.0-draft
```

2. **删除 §8.1 中 DangerZone 引用**，改为 DataManagement。

3. **补充 auth.json 环境变量方案**（解决架构师 5.4）:

在 §4.2 尾部添加：

```markdown
### 4.2.1 安全增强（推荐方案）

为消除 auth.json 临时文件残留风险，pi agent 启动时通过环境变量传递 API Key：

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

fallback：若 pi agent 不支持环境变量注入，保持 auth.json 方案 + 增加清理逻辑：
- 应用启动时清理 `$APP_DATA/pi-agent/auth.json`
- SIGKILL handler 注册 `atexit` 清理
- 空闲超时时由超时逻辑确保 delete 执行
```

4. **删除 §4.2 中的 "关闭 pi 进程后删除" 时序风险描述**，改为环境变量方案。

---

## 五、P2 修复行动 — 下周完成（~2h）

### A14. 全局 bump 版本号 v0.1.0 → v0.2.0

**涉及文件**:

| 文件 | 当前版本 |
|------|---------|
| `.dev/docs/error-states.md` | v0.1.0-draft |
| `.dev/docs/i18n-standards.md` | v0.1.0-draft |
| `.dev/docs/module-split.md` | v0.2.0-draft ✅ 已更新 |
| `.dev/docs/modules/stores.md` | (无版本号，P0 修复时补充) |
| `.dev/docs/modules/infrastructure.md` | (无版本号，P0 修复时补充) |
| `.dev/docs/modules/tauri-commands.md` | (无版本号，P0 修复时补充) |
| `.dev/docs/modules/pages/login-page.md` | (无版本号，已废弃) |
| `.dev/docs/modules/pages/settings-page.md` | (无版本号，P0 重写时补充) |
| `.dev/docs/modules/pages/workspace-page.md` | (无版本号，P1 补充) |
| `.dev/docs/modules/features/*.md` (11 个) | 均无版本号 |

**变更**: 所有无版本号的模块文档，在头部添加：

```markdown
> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
```

---

### A15. 更新 TODO.md

**文件**: `.dev/TODO.md`

**变更**: 移除已解决的条目，添加文档修复跟踪：

```markdown
# 文档一致性修复
- [x] v0.2.0 决策传播到所有子文档
- [x] 删除 license/login 残留
- [x] 统一品牌名称 geex-docx
- [x] Agent 状态机补充 edge cases
- [x] 上下文注入分级策略明确

# 现在要解决
- [ ] 超大文档性能方案：虚拟分页渲染（需与 docx-editor-core 团队确认）
- [ ] Tauri command 接口契约补全（agent_send payload 结构等）
- [ ] auth.json 环境变量方案（需确认 pi agent 支持情况）

# 数据持久化
- [ ] 自动保存与崩溃恢复实现（设计已完善，见 data-persistence.md）
```

---

## 六、产品决策待确认

以下 4 个问题需要产品决策后执行：

| # | 问题 | 推荐方案 | 备选 |
|---|------|---------|------|
| **Q1** | 打印功能是否进入 MVP？ | **A) 不进入**，从 FRS 删除 F-145 | B) 进入 Phase 4，分配 `features/print/` |
| **Q2** | 首次启动是否需要 onboarding？ | **A) 自动打开 SettingsDrawer** 到 ApiKeySection（成本最低） | B) 编辑器空白处放引导卡片；C) 仅底部提示条 |
| **Q3** | 无文档时 Agent 行为？ | **A) 自由模式可用**（通用问答），文档操作类置灰 | B) 完全不可用；C) 仅隐藏命令面板 |
| **Q4** | auth.json 安全增强优先级？ | **A) 环境变量方案**（如 pi 支持）；否则 fallback + atexit 清理 | B) 先实现当前方案，Phase 2 优化 |

### 我的推荐理由

- **Q1 不进入 MVP**：Tauri 端打印（ProseMirror → HTML → 系统打印）复杂度高，且用户可通过 `文件 → 打印` 在后续版本获得。MVP 聚焦编辑 + Agent。
- **Q2 自动打开 Drawer**：首次启动用户需要知道 Agent 功能存在，自动打开 SettingsDrawer 到 ApiKeySection 是最直接的引导。后续可 A/B 测试引导卡片。
- **Q3 自由模式可用**：不阻断用户使用 Agent 问通用问题（如"如何写一份好的报告"），但明确告知文档操作需打开文档。
- **Q4 环境变量方案优先**：auth.json 明文落盘是安全红线，需在 Phase 3（Agent 集成）前解决。建议先确认 pi agent 是否支持环境变量读取 API Key。

---

## 七、执行顺序

```
Week 1（立即）:
  Day 1: A1(stores.md) + A2(tauri-commands.md)                 [~1.5h]
  Day 2: A3(login-page.md) + A4(settings-page.md) + A6(proto)  [~1.5h]
  Day 3: A5(features/settings.md) + A10(infrastructure.md)      [~1h]

Week 1-2（并行）:
  Day 3-4: A7 (TSS 升级 + 补充)                               [~2h]
  Day 3:   A8 (删除 full.md) + A12 (agentwrite 替换)          [~0.5h]
  Day 4:   A9 (迭代计划对齐) + A11 (workspace-page 补充)       [~0.5h]
  Day 4-5: A7b (Tauri command 契约补全)                       [~1.5h]
  Day 5:   A13 (data-persistence.md 升级)                     [~1h]

Week 2:
  Day 5: A14(全局 bump 版本号) + A15(更新 TODO.md)              [~1h]
  Day 5: Q1-Q4 产品决策确认                                     [~0.5h]
```

---

## 八、验收标准

修复完成后，以下检查项必须通过：

- [ ] 在所有 `.dev/` 文件中 grep `license\|License\|许可\|激活\|login\|登录\|注册\|agentwrite\|AgentWrite` 仅出现在已废弃的 `login-page.md` 和本修复方案中
- [ ] `grep -r "AppPage" .dev/` 返回空
- [ ] `grep -r "setPage" .dev/` 返回空（除本方案）
- [ ] `grep -r "licenseStatus" .dev/` 返回空（除本方案）
- [ ] `grep -r "v0.1.0" .dev/` 返回空（除 `login-page.md` 和 `requirements-full.md` 删除后）
- [ ] BRD §5、module-split.md §6 的迭代计划使用统一的 Phase + 版本号映射
- [ ] `requirements-technical.md` 版本号为 v0.2.0，§1.4 不含激活码描述，§6 不含许可管理
- [ ] `data-persistence.md` 版本号为 v0.2.0，§4.2 包含环境变量方案或 atexit 清理方案
- [ ] `workspace-page.md` 包含 SettingsDrawer 章节

**验证命令**:
```bash
# 一键检查脚本
cd .dev
echo "=== Checking license/login residuals ==="
grep -rn -i "license\|许可\|激活" --include="*.md" . | grep -v "login-page.md\|meeting/\|plan/"
echo "=== Checking old product name ==="
grep -rn "agentwrite\|AgentWrite" --include="*.md" . | grep -v "login-page.md\|meeting/\|plan/"
echo "=== Checking old version ==="
grep -rn "v0.1.0" --include="*.md" .
echo "=== Checking AppPage/setPage ==="
grep -rn "AppPage\|setPage" --include="*.md" .
```
