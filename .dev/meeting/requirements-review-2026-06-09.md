# 需求文档审阅纪要 — v0.2.0 一致性审查

> **日期**: 2026-06-09
> **审阅人**: 产品负责人
> **审阅范围**: `.dev/requirements/` × 4, `.dev/docs/modules/` × 14, `.dev/docs/module-split.md`
> **背景**: v0.2.0 重大决策 — 开源化、单页面架构、移除 license/login 模块

---

## 📊 总览

| 严重度 | 数量 | 说明 |
|--------|------|------|
| 🔴 Critical | 8 | v0.2.0 决策后未同步，会导致实现走错方向 |
| 🟡 Major | 5 | 不一致但不阻塞当前 Phase（Phase 1 涉及时需修复） |
| 🟢 Minor | 7 | 旧产品名残留、命名规范、文档标注问题 |

---

## 🔴 Critical — v0.2.0 残余 (必须立即修复)

### C1. `stores.md` — useAppStore 仍使用三页面路由

**位置**: `.dev/docs/modules/stores.md:172-196`

**问题**:
```typescript
// ❌ 当前
type AppPage = "login" | "workspace" | "settings";
const currentPage = useAppStore(s => s.currentPage);
if (currentPage === "login") return <LoginPage />;
if (currentPage === "settings") return <SettingsPage />;
```

**应为**:
```typescript
// ✅ v0.2.0 单页面
// useAppStore 不再管理页面路由（WorkspacePage 是唯一路由）
// activePanel / activeModal 替代 page 概念
```

**影响**: 开发 Phase 1 时若参考此文会错误地实现多页面路由。

---

### C2. `stores.md` — useSettingsStore 仍含 licenseStatus

**位置**: `.dev/docs/modules/stores.md:138-143`

**问题**:
```typescript
// ❌ 残留
licenseStatus: LicenseStatus;
setLicenseStatus(status: LicenseStatus): void;
// 初始化调用 Tauri check_license() → setLicenseStatus
```

**应为**: 完全移除 `licenseStatus` 字段和相关 action。

**影响**: SettingsStore 类型定义包含废弃字段。

---

### C3. `tauri-commands.md` — §4 整节 license 命令

**位置**: `.dev/docs/modules/tauri-commands.md:214-320`

**问题**: 整个 §4 `commands/license.rs` + license 子模块 + `collect_commands!` 注册仍保留：

```rust
commands::license::activate_license,
commands::license::check_license,
commands::license::get_device_fingerprint,
```

以及 `pub mod license;`、`license/mod.rs` 子模块设计。

**应为**: 移除 §4 整节，并更新 `collect_commands!` 示例和文件清单。

---

### C4. `features/settings.md` — LicenseSection + DangerZone → login

**位置**: `.dev/docs/modules/features/settings.md`

**问题**: 组件结构仍然包含：
```
├── LicenseSection.tsx           # ❌ 应移除
├── DangerZone.tsx               # ❌ clear + setPage("login")
```

`useSettings` hook 仍返回 `licenseStatus` 和 `activateLicense()`，Tauri 依赖中仍有 `activate_license` / `check_license`。

**应为**: 移除 `LicenseSection`，将 `DangerZone` 中的 `setPage("login")` 改为退出应用逻辑。Hook 移除 `licenseStatus` / `activateLicense`。

---

### C5. `pages/settings-page.md` — 整页仍为独立页面设计

**位置**: `.dev/docs/modules/pages/settings-page.md`

**问题**:
- 仍使用 `useAppStore.page === "settings"` 路由判断
- 包含 `LicenseSection` 数据流
- `DangerZone` → `setPage("login")`
- 标题为 "SettingsPage — 设置页面"

**应为**: 重构为 **SettingsDrawer** 文档，说明其作为 WorkspacePage 内 Drawer 的设计：
- 无路由行为，由 `useAppStore.activeModal` 或专用 flag 控制
- 移除 License 区域
- 风险区改为"重置所有设置"+"退出应用"

---

### C6. `pages/login-page.md` — 已废弃但未标记

**位置**: `.dev/docs/modules/pages/login-page.md`

**问题**: 整份 login 页面设计文档仍然标记为"草案"，未标注废弃状态。

**应为**: 在文档头部添加废弃标记：
```markdown
> ⚠️ **已废弃 (v0.2.0)**：开源化后去除用户注册/登录功能。此文档仅为历史参考。
```

或直接移入 `_archive/` 目录。

---

### C7. `.dev/proto/login.html` — 废弃原型文件

**位置**: `.dev/proto/login.html`

**问题**: Login 页面 UI 原型尚在，但功能已移除。

**应为**: 删除或归档。BRD 已明确 "无登录/激活页"。

---

### C8. `requirements-full.md` — 全量备份包含 license 功能

**位置**: `.dev/requirements/requirements-full.md:256-264`

**问题**: 此 v0.1.0 备份文件仍包含：

```markdown
#### 许可与激活
| F-160 | 激活码验证 | ... | Must |
| F-161 | 试用期管理 | ... | Must |
| F-162 | 设备绑定 | ... | Should |
| F-164 | 激活状态展示 | ... | Must |
```

以及安全说明中的"激活码离线验证"（L301）、架构约束中的"许可管理"（L325）、验收清单中的"激活码验证流程"（L783）。

**应为**: 重新生成此备份文件（从拆分后的 BRD/FRS/TSS 合并），或直接删除（拆分版已是权威来源）。

---

## 🟡 Major — 跨文档不一致

### M1. requirements-technical.md — 许可相关残留

**位置**: `.dev/requirements/requirements-technical.md`

**问题**:
- L46: "激活码离线验证，不强制要求联网" — 安全章节
- L70: `| 许可管理 | Tauri Rust 后端 (RSA 签名验证) | 激活码离线验证...`
- L783 附近: 验收清单中含 "激活码验证流程可正常完成"

BRD 已移除许可系统，TSS 应同步删除这些条目。

---

### M2. 迭代计划命名不统一

| 文档 | 命名方式 | 示例 |
|------|---------|------|
| BRD §5 | 版本号 | `v0.1.0`, `v0.2.0`, `v0.3.0`, `v1.0.0` |
| module-split.md §6 | Phase | `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4` |

**问题**: 两套命名体系容易混淆。BRD v0.1.0 范围（编辑器 + Agent 入口）明显大于 module-split 的 Phase 1（仅骨架）。

**建议**: 统一使用 Phase 1→4 对应代码里程碑，保留 v0.x.0 作为对外发布版本号。明确映射：
```
Phase 1 (骨架) + Phase 2 (编辑器核心) → v0.1.0-beta
Phase 3 (Agent 集成)                → v0.2.0-beta
Phase 4 (完善)                       → v1.0.0
```

---

### M3. Agent 上下文注入策略仍为"未来增强"

**位置**: `requirements-technical.md §4.4`

**问题**: 全文操作（校对/排版优化）的 Agent 交互策略依赖于"Prompt 注入"方式 — 将整个文档内容嵌入 prompt。这会带来两个问题：

1. **超大文档**: 100 页文档可能有 50K+ tokens，超出大部分模型的上下文窗口
2. **成本**: 每次全文操作都在 prompt 中传输全量文档内容

文档中标注"未来增强：通过 pi extension 注册工具"来解决问题，但没有给出 MVP 阶段的明确策略（流式分页注入？仅注入大纲摘要？混合策略？）。

**建议**: 在 MVP 阶段明确定义文本操作分级策略：
- **≤ 500 字选区操作**: 全量注入（润色/翻译/扩写）
- **全文操作**: 仅注入大纲 + 结构概览 + AgentCommand schema
- 文档中明确写出每种 AIAction 的上下文注入大小估算

---

### M4. Settings 多语言 Key 含 license/login 条目

**位置**: `.dev/docs/modules/pages/settings-page.md §9`

**问题**: 多语言表中包含以下已废弃 Key：

| Key | 应移除原因 |
|-----|-----------|
| `settings.license` | license 功能已移除 |
| `settings.activated` | 同上 |
| `settings.trial` | 同上 |
| `settings.activate` | 同上 |
| `settings.clearData` (exit) | 跳转 login 逻辑已废弃→ 改为退出应用 |

---

### M5. useAppStore 职责需要重新定义

**问题**: v0.2.0 单页面架构后，`useAppStore` 不再需要 `currentPage`。但当前设计中其他职责不清：
- `activeModal` 用于管理 Portal 弹窗（CommandPalette、FindReplace 等）
- 是否还管理 Sidebar/Drawer 面板的展开状态？
- 与各 feature 自身状态（如 AgentSidebar 的展开/宽度）的边界在哪？

**建议**: 明确定义 `useAppStore` 新职责：
```typescript
interface AppState {
  // 全局浮层栈
  activeModal: ModalId | null;  // "commandPalette" | "findReplace" | "pageSetup" | ...
  // 侧边面板
  settingsDrawerOpen: boolean;
  agentSidebarOpen: boolean;
  outlinePanelCollapsed: boolean;
  // 加载
  isInitialLoading: boolean;
}
```

---

## 🟢 Minor — 命名与规范

### N1. 旧产品名 "agentwrite" / "AgentWrite" 残留

| 位置 | 当前值 | 应改为 |
|------|--------|--------|
| `document.md:97` | `localStorage` key `agentwrite:recent-files` | `geex-docx:recent-files` |
| `settings.md:101` | `localStorage` key `agentwrite:settings` | `geex-docx:settings` |
| `stores.md:159` | `localStorage.getItem("agentwrite:settings")` | `geex-docx:settings` |
| `login-page.md:19` | 品牌名称 "AgentWrite" | 文档已废弃，不处理 |

---

### N2. 模块文档状态标记

所有 `.dev/docs/modules/features/*.md` 和 `.dev/docs/modules/pages/*.md` 均标记为"状态：草案"。

**建议**: 文档头部增加"确认度"标记，帮助 Phase 实现时判断可信度：
```markdown
> **状态**: 草案 (Phase 2 实现前冻结) / 已确认 (可开工) / 待修订 (需产品决策)
```

当前建议分级：
- 🟢 可开工：`stores.md`、`infrastructure.md`、`document.md`、`editor.md`
- 🟡 待微调：`agent.md`、`formatting.md`、`tauri-commands.md`（移除 license）
- 🔴 需重写：`settings.md`、`settings-page.md`（Drawer 化）
- ⚫ 已废弃：`login-page.md`

---

### N3. requirements-full.md 版本标记错误

`requirements-full.md` 标记为 `v0.1.0-draft` (2026-06-08)，但拆分后的 BRD/FRS 已更新到 `v0.2.0-draft`，TSS 仍在 `v0.1.0-draft`。

**建议**: 要么保持 `requirements-full.md` 与拆分后文档同步（增加自动合并脚本），要么直接删除它，以拆分版为唯一权威来源。

---

### N4. FRS 功能编号中存在空白区间

`requirements-functional.md` 中：
- F-037→F-040 之间有间隙（段落格式从 040 开始）
- F-047→F-080 之间有 32 个编号空白（表格从 080 开始）
- F-094→F-100（页面布局）、F-108→F-110（引用）等也有间隙

**建议**: 如果这些空白是预留扩展空间，在文档中说明编号规则。如果是历史遗留，重新编号使其连续更易维护。

---

### N5. Agent 进程状态机缺少 edge cases

`requirements-technical.md §5.1` 的状态机设计质量很高，但缺少两个边界状态：

| 缺失状态 | 触发条件 | 建议行为 |
|---------|---------|---------|
| `NotInstalled` | `pi` 二进制未找到 | 提示用户安装 pi agent / 显示下载引导 |
| `ShuttingDown` | 应用退出 / 空闲超时 | 过渡状态，SIGTERM → 3s → SIGKILL |

---

### N6. Session 管理缺少文档 hash 计算细节

`requirements-technical.md §5.3` 设计为每文档一个 session，通过 `$APP_DATA/sessions/<doc_hash>.jsonl` 持久化。但未定义：

- 文档 hash 算法（SHA256 of path? of initial content?）
- 文档重命名时 hash 是否变化（文中说"不变"，但取决于 hash 算法）
- 另存为时是复制 session 历史还是创建全新 session？

---

### N7. "打印"功能状态不一致

| 文档 | 状态 |
|------|------|
| `requirements-full.md` (L62) | ✅ In Scope（但功能表 F-145 是 Should） |
| `requirements-business.md` (拆分版) | ❌ 未在 In Scope 列表中 |
| `requirements-functional.md` | F-145 标记 Should |

**建议**: 统一为 Should（Phase 4），或直接从 MVP In Scope 中移除。

---

## 📋 优先修复计划

### 立即修复 (Phase 1 开工前)

| # | 项目 | 文件 | 工作量 |
|---|------|------|--------|
| C1 | 重写 useAppStore 为单页面版 | `stores.md` | 0.5h |
| C2 | 移除 useSettingsStore 中 licenseStatus | `stores.md` | 0.5h |
| C3 | 移除 tauri-commands 中 license 章节 | `tauri-commands.md` | 0.5h |
| C4 | 重写 settings feature 文档 | `features/settings.md` | 1h |
| C5 | 重写 settings 页面 → Drawer 文档 | `pages/settings-page.md` | 1h |
| C6 | 标记 login-page.md 废弃 | `pages/login-page.md` | 0.1h |
| C7 | 删除 login.html 原型 | `.dev/proto/login.html` | 0.1h |
| M1 | 清理 TSS 中 license 残留 | `requirements-technical.md` | 0.5h |

**小计**: ~4.2h

### Phase 2 开始前修复

| # | 项目 | 文件 | 工作量 |
|---|------|------|--------|
| C8 | 更新或删除 requirements-full.md | `requirements-full.md` | 1h |
| M2 | 统一迭代计划命名 | BRD + module-split | 0.5h |
| M3 | 明确 Agent 上下文注入分级策略 | TSS §4.4 | 1h |
| M5 | 重新定义 useAppStore 职责 | `stores.md` | 0.5h |
| N1 | 全局替换 agentwrite → geex-docx | 5 个文件 | 0.5h |

**小计**: ~3.5h

### 低优先级

| # | 项目 | 工作量 |
|---|------|--------|
| M4 | 清理 settings i18n 中 license key | 0.2h |
| N2 | 为模块文档添加确认度标记 | 0.5h |
| N3 | 决策 requirements-full.md 的去留 | 0.1h |
| N4 | 规范 FRS 功能编号 | 0.5h |
| N5 | 补充 Agent 状态机 edge cases | 0.5h |
| N6 | 细化 session 管理 hash 策略 | 0.5h |
| N7 | 统一打印功能优先级 | 0.1h |

**小计**: ~2.4h

---

## ✅ 设计质量亮点

尽管存在上述不一致问题，以下方面值得肯定：

1. **文档层级完整**: BRD → FRS → TSS → 模块设计 → 页面设计，覆盖产品全层级
2. **Agent 协议设计清晰**: pi agent 的 RPC 子进程通信、JSONL 协议、上下文注入策略框架合理
3. **前端状态管理设计优秀**: Zustand 4 独立 store 的拆分逻辑清晰，EditorBridge 模式避免了 prop drilling
4. **Tauri 后端安全性考虑周全**: Keychain 存储 API Key、文件路径校验、capability 白名单
5. **多语言支持从一开始就纳入设计**: 每个模块文档都有 i18n 章节，Key 命名基本规范
6. **模块依赖方向明确**: 单向依赖 `pages → features → stores → lib`，模块间低耦合

---

## 📎 后续行动项

- [ ] 按优先级修复上述 Critical 问题（建议一次性修复，避免遗漏）
- [ ] 确认修复后的文档是否需要二次审阅
- [ ] 确定 Phase 1 开工前文档冻结日期
- [ ] 决定是否新建设计文档 checklist 用于自动检测跨文档不一致
