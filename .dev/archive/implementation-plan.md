# Raven 实施计划

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09
> **状态**: 草案 — 架构师拟定
>
> **联动文档**：
> - [模块拆分方案](../docs/module-split.md)
> - [架构审视报告](../meeting/architecture-review-2026-06-09.md)
> - [业务需求 (BRD)](../requirements/requirements-business.md)
> - [技术规格 (TSS)](../requirements/requirements-technical.md)

---

## 1. 总体思路

采用 **git worktree 并行分支** 策略：每个 Phase 内，将独立模块分配到不同 worktree 分支并行开发，完成后合并到主干。

```
main
 ├── Phase 0: 文档修复（串行，无 worktree）
 │
 ├── Phase 1: 骨架搭建
 │   ├── wt/phase1-stores        # stores/ + lib/ 基础设施
 │   ├── wt/phase1-shell          # WorkspacePage 布局壳
 │   ├── wt/phase1-settings       # Settings Drawer + API Key 配置
 │   └── wt/phase1-tauri-fs       # Tauri commands (file + system)
 │
 ├── Phase 2: 编辑器核心
 │   ├── wt/phase2-editor         # EditorPane + EditorBridge + StatusBar
 │   ├── wt/phase2-formatting     # Toolbar + FormatState
 │   ├── wt/phase2-document       # 打开/保存/最近文件
 │   └── wt/phase2-outline-ruler  # 大纲面板 + 标尺 + 缩放
 │
 ├── Phase 3: Agent 集成
 │   ├── wt/phase3-pi-backend     # pi 子进程管理 + 事件分发
 │   ├── wt/phase3-agent-chat     # AgentSidebar + 消息流
 │   ├── wt/phase3-cmd-palette    # CommandPalette + QuickActions
 │   └── wt/phase3-agent-actions  # AI 动作执行（润色/翻译/校对）
 │
 └── Phase 4: 完善
     ├── wt/phase4-table-refs     # 表格 + 超链接 + 脚注
     ├── wt/phase4-page-layout    # 页面设置 + 页眉页脚
     ├── wt/phase4-review         # 批注 + 修订建议
     ├── wt/phase4-template       # 模板变量
     └── wt/phase4-polish         # 快捷键/多语言/暗色模式/自动更新
```

---

## 2. Phase 0 — 文档修复（串行，阻塞后续所有 Phase）

> **目标**：消除架构审视报告中的 P0/P1 问题，确保文档一致性
> **时长**：0.5 天
> **合并策略**：直接在 main 上修改，无需 worktree

### 2.1 P0 修复（阻塞项）

| # | 任务 | 涉文件 | 参考文档 |
|---|------|--------|----------|
| 0.1 | TSS 升级到 v0.2.0，删除许可/激活全部内容 | `requirements-technical.md` | [架构审视 §2.1](../../meeting/architecture-review-2026-06-09.md) |
| 0.2 | stores.md 修复：删除 `licenseStatus`、修正 `AppPage` 为单页面架构 | `modules/stores.md` | [架构审视 §3.1, §3.2](../../meeting/architecture-review-2026-06-09.md) |
| 0.3 | infrastructure.md 删除页面切换代码示例 | `modules/infrastructure.md` | [架构审视 §3.3](../../meeting/architecture-review-2026-06-09.md) |
| 0.4 | 归档 login-page.md、合并 settings-page.md 到 workspace-page.md | `modules/pages/` | [架构审视 §7](../../meeting/architecture-review-2026-06-09.md) |

### 2.2 P1 架构完善

| # | 任务 | 涉文件 | 参考文档 |
|---|------|--------|----------|
| 0.5 | TSS 补充无文档时的 Agent 行为（自由模式 vs 文档模式） | `requirements-technical.md` §4.4.2 | [架构审视 §5.1](../../meeting/architecture-review-2026-06-09.md) |
| 0.6 | TSS 补充首次启动 API Key 引导流程 | `requirements-technical.md` §4.4.4 | [架构审视 §5.2](../../meeting/architecture-review-2026-06-09.md) |
| 0.7 | TSS 补充 steer vs follow_up 前端语义状态表 | `requirements-technical.md` §4.4.3 | [架构审视 §5.3](../../meeting/architecture-review-2026-06-09.md) |
| 0.8 | data-persistence.md 补充 auth.json 环境变量注入方案 | `data-persistence.md` §4.2 | [架构审视 §5.4](../../meeting/architecture-review-2026-06-09.md) |
| 0.9 | 确认打印功能是否进入 MVP，统一 BRD/FRS | `requirements-business.md` / `requirements-functional.md` | [架构审视 §4.1](../../meeting/architecture-review-2026-06-09.md) |
| 0.10 | TSS 补充虚拟分页渲染策略（超大文档） | `requirements-technical.md` §1.1 | TODO.md |
| 0.11 | 填充 tauri-commands.md 完整命令契约 | `modules/tauri-commands.md` | [架构审视 §6.3](../../meeting/architecture-review-2026-06-09.md) |
| 0.12 | 全局 bump 所有子文档到 v0.2.0-draft | 全部子文档 | [架构审视 §2.3](../../meeting/architecture-review-2026-06-09.md) |

**Phase 0 验收标准**：
- [ ] `rg -i "license|激活|login|登录" .dev/` 仅在 archive 路径和 BRD "范围外" 中出现
- [ ] 所有子文档版本号 ≥ v0.2.0-draft
- [ ] `modules/stores.md` 不包含 `licenseStatus`、`AppPage`
- [ ] `modules/tauri-commands.md` 包含所有 command 的完整签名和校验规则

---

## 3. Phase 1 — 骨架搭建（4 worktree 并行）

> **目标**：跑通最小闭环 — 编辑器空白壳 + API Key 配置 + 文件操作
> **时长**：3 天（并行）
> **总 merge 到 main**：1 次（分支汇总后合并）

### worktree 命令模板

```bash
# 创建 worktree
git worktree add -b wt/phase1-stores ../Raven-phase1-stores main

# 开发完成后
cd ../Raven-phase1-stores
git add . && git commit -m "feat(phase1): stores + lib infrastructure"
git push origin wt/phase1-stores

# 合并到 main
cd <main-repo>
git merge wt/phase1-stores

# 清理 worktree
git worktree remove ../Raven-phase1-stores
git branch -d wt/phase1-stores
```

### 3.1 Branch: `wt/phase1-stores` — 状态管理 + 基础设施

**依赖**: 无

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 1.1a | 创建 `useDocumentStore` | `stores/useDocumentStore.ts` | [stores.md §2](../docs/modules/stores.md) |
| 1.1b | 创建 `useAgentStore` | `stores/useAgentStore.ts` | [stores.md §3](../docs/modules/stores.md) |
| 1.1c | 创建 `useSettingsStore` + `persist` 中间件 | `stores/useSettingsStore.ts` | [stores.md §4](../docs/modules/stores.md) |
| 1.1d | 创建 `useAppStore` | `stores/useAppStore.ts` | [stores.md §5](../docs/modules/stores.md) |
| 1.1e | `cn()` 工具 | `lib/cn.ts` | [infrastructure.md §2](../docs/modules/infrastructure.md) |
| 1.1f | Tauri 事件封装 `onPiEvent()` / `onCloseRequested()` | `lib/tauri-events.ts` | [infrastructure.md §3](../docs/modules/infrastructure.md) |
| 1.1g | `callTauriCommand()` / `callTauriCommandVoid()` | `hooks/useTauriCommand.ts` | [infrastructure.md §4](../docs/modules/infrastructure.md) |
| 1.1h | `useKeyboard()` hook | `hooks/useKeyboard.ts` | [infrastructure.md §5](../docs/modules/infrastructure.md) |
| 1.1i | i18n 基础：`zh-CN.ts`、`en.ts`、`useT()` | `lib/i18n/` | [infrastructure.md §6](../docs/modules/infrastructure.md)、[i18n-standards.md](../docs/i18n-standards.md) |
| 1.1j | Zustand 单元测试 | `stores/__tests__/` | [AGENTS.md §Testing](../../AGENTS.md) |

**测试重点**：
- `useSettingsStore.loadFromStorage()` 的异步初始化流程
- `useAgentStore` 消息追加/更新/流式完成的状态变迁
- `useDocumentStore` 的 `canUndo`/`canRedo` 变化
- i18n fallback 链：en → zh-CN → key 原文

### 3.2 Branch: `wt/phase1-shell` — WorkspacePage 布局壳

**依赖**: `wt/phase1-stores`（仅读取 store 类型，不依赖实现）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 1.2a | `WorkspacePage` 布局壳（单页面） | `pages/WorkspacePage.tsx` | [module-split.md §2](../docs/module-split.md) |
| 1.2b | `DocumentTitleBar` 占位组件 | `features/document/components/DocumentTitleBar.tsx` | [module-split.md §2](../docs/module-split.md) |
| 1.2c | `MenuBar` 骨架（7 个菜单项，仅文案） | `pages/WorkspacePage.tsx` (内部组件) | [i18n-standards.md §4.2](../docs/i18n-standards.md) |
| 1.2d | `Toolbar` 占位容器 | `features/formatting/components/Toolbar.tsx` | [module-split.md §3.3](../docs/module-split.md) |
| 1.2e | `EditorPane` 占位容器 | `features/editor/components/EditorPane.tsx` | [module-split.md §3.2](../docs/module-split.md) |
| 1.2f | `StatusBar` 占位组件 | `features/editor/components/StatusBar.tsx` | [module-split.md §3.2](../docs/module-split.md) |
| 1.2g | `AgentSidebar` 占位组件（空壳，带 toggle） | `features/agent/components/AgentSidebar.tsx` | [module-split.md §3.8](../docs/module-split.md) |
| 1.2h | `OutlinePanel` 占位组件（可折叠） | `features/editor/components/OutlinePanel.tsx` | [module-split.md §3.2](../docs/module-split.md) |
| 1.2i | `App.tsx` 更新：入口改为 WorkspacePage | `app.tsx` | [module-split.md §2](../docs/module-split.md) |
| 1.2j | shadcn/ui 补充组件：`dialog`、`drawer`（或 `sheet`）、`popover` | `components/ui/` | shadcn/ui CLI |

**测试重点**：
- WorkspacePage 渲染不崩溃
- AgentSidebar toggle 开关正常
- OutlinePanel 折叠/展开
- 布局在 1024×768 到 2560×1440 范围不溢出

### 3.3 Branch: `wt/phase1-settings` — Settings Drawer + API Key 配置

**依赖**: `wt/phase1-stores`（`useSettingsStore`、`useAppStore`）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 1.3a | `SettingsDrawer` 容器（右侧滑出） | `features/settings/components/SettingsDrawer.tsx` | [workspace-page.md](../docs/modules/pages/workspace-page.md) |
| 1.3b | `ApiKeySection`：Provider 选择 + Key 输入 + 测试连接 | `features/settings/components/ApiKeySection.tsx` | [FRS F-150~153](../requirements/requirements-functional.md) |
| 1.3c | `modelConfig` UI：模型选择 + Thinking 开关 + 流式开关 | `features/settings/components/ApiKeySection.tsx` | [FRS F-152](../requirements/requirements-functional.md) |
| 1.3d | `EditorPreferences` UI：主题/语言/默认字号/自动保存 | `features/settings/components/EditorPreferences.tsx` | [FRS F-060~062](../requirements/requirements-functional.md) |
| 1.3e | `useSettings()` hook：封装读写 + persist | `features/settings/hooks/useSettings.ts` | [data-persistence.md §3](../docs/data-persistence.md) |
| 1.3f | WorkspacePage 集成 SettingsDrawer（toggle 按钮） | `pages/WorkspacePage.tsx` | [module-split.md §2](../docs/module-split.md) |
| 1.3g | 首次启动自动打开 SettingsDrawer 到 ApiKeySection | `pages/WorkspacePage.tsx` | [TSS §4.4.4](../requirements/requirements-technical.md) |

**测试重点**：
- API Key 输入 → mask 显示 → 保存 → 重新打开 drawer 显示 mask
- Provider 切换：Anthropic / OpenAI / 自定义 URL
- 测试连接：mock Tauri command 返回成功/失败
- 首次启动 autoOpen 逻辑

### 3.4 Branch: `wt/phase1-tauri-fs` — Tauri 后端文件命令

**依赖**: 无（纯 Rust 端）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 1.4a | 拆分 `commands.rs` 为 `commands/` 目录（file/system） | `src-tauri/src/commands/` | [tauri-commands.md](../docs/modules/tauri-commands.md) |
| 1.4b | `open_docx(path)` — 路径校验 + 读取 OOXML 字节 | `commands/file.rs` | [tauri-commands.md §2](../docs/modules/tauri-commands.md) |
| 1.4c | `save_docx` / `save_as_docx` — 写入 + autosave 备份 | `commands/file.rs` | [tauri-commands.md §2](../docs/modules/tauri-commands.md) |
| 1.4d | `get_recent_files()` — 从 state.json 读取 | `commands/file.rs` | [data-persistence.md §3](../docs/data-persistence.md) |
| 1.4e | `get_system_info()` — os/arch/locale | `commands/system.rs` | [tauri-commands.md §5](../docs/modules/tauri-commands.md) |
| 1.4f | Keychain 命令：`get_api_key_masked` / `set_api_key` / `delete_api_key` | `commands/file.rs` 或 `commands/keychain.rs` | [tauri-commands.md §4.1](../docs/modules/tauri-commands.md) |
| 1.4g | 注册所有 command 到 `lib.rs` | `src-tauri/src/lib.rs` | [AGENTS.md §Tauri Commands](../../AGENTS.md) |
| 1.4h | `Cargo.toml` 添加 `sys-locale`、`keyring` crate | `Cargo.toml` | [tauri-commands.md](../docs/modules/tauri-commands.md) |

**测试重点**：
- `open_docx` 路径遍历拒绝（`../`、`/etc/passwd`）
- `save_docx` 磁盘满 mock
- Keychain 读写循环（set → get → delete → get 返回空）
- sys-locale 返回合法 locale 值

### Phase 1 合并验证

```bash
# 合并所有 Phase 1 分支到 main
git merge wt/phase1-stores wt/phase1-shell wt/phase1-settings wt/phase1-tauri-fs

# 验证
bun run typecheck    # TypeScript 无错误
bun run check        # Biome lint 无错误
bun run test         # 所有测试通过
bun tauri dev        # 启动后显示 WorkspacePage 布局
```

---

## 4. Phase 2 — 编辑器核心（4 worktree 并行）

> **目标**：DocxEditor 集成 + 文档打开/编辑/保存闭环
> **时长**：5 天（并行）
> **前置**：Phase 1 完成

### 4.1 Branch: `wt/phase2-editor` — 编辑器核心

**依赖**: Phase 1（WorkspacePage 壳 + stores）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 2.1a | `useEditorBridge` — DocxEditor ref 封装 | `features/editor/hooks/useEditorBridge.ts` | [module-split.md §4.4](../docs/module-split.md) |
| 2.1b | `EditorPane` 集成 `<DocxEditor>` + editorBridge 存入 store | `features/editor/components/EditorPane.tsx` | [module-split.md §3.2](../docs/module-split.md) |
| 2.1c | `StatusBar` 实时显示页码/字数/光标位置 | `features/editor/components/StatusBar.tsx` | [FRS F-063](../requirements/requirements-functional.md) |
| 2.1d | 选区监听：更新 `selectionInfo` + `selectionFormat` | `features/editor/hooks/useEditorBridge.ts` | [stores.md §2](../docs/modules/stores.md) |
| 2.1e | 撤销/重做状态同步（Ctrl+Z/Y） | `features/editor/hooks/useEditorBridge.ts` | [FRS F-025](../requirements/requirements-functional.md) |
| 2.1f | 新建文档：`createEmptyDocument()` | `features/editor/hooks/useEditorBridge.ts` | [FRS F-010](../requirements/requirements-functional.md) |

**测试重点**：
- `useEditorBridge` 初始化 → DocxEditor mount → `editorBridge` 非 null
- 文本输入 → `isDirty` = true
- 选区变化 → `selectionInfo` 更新 → `selectionFormat` 同步
- 撤销 → `canUndo`/`canRedo` 正确

### 4.2 Branch: `wt/phase2-formatting` — 格式工具栏

**依赖**: `wt/phase2-editor`（`useEditorBridge`、`selectionFormat`）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 2.2a | `Toolbar` 完整实现（粗/斜/下划线/删除线/上标/下标） | `features/formatting/components/Toolbar.tsx` | [FRS F-030, F-035](../requirements/requirements-functional.md) |
| 2.2b | `FontPicker` + `FontSizePicker` | `features/formatting/components/` | [FRS F-031, F-032](../requirements/requirements-functional.md) |
| 2.2c | `ColorPicker`（文字颜色 + 高亮） | `features/formatting/components/ColorPicker.tsx` | [FRS F-033, F-034](../requirements/requirements-functional.md) |
| 2.2d | 标题 1-6 下拉 + 对齐按钮 + 列表按钮 | `features/formatting/components/Toolbar.tsx` | [FRS F-040~042](../requirements/requirements-functional.md) |
| 2.2e | `useFormatState` — 根据选区更新按钮 active 状态 | `features/formatting/hooks/useFormatState.ts` | [module-split.md §3.3](../docs/module-split.md) |
| 2.2f | shadcn/ui 补充：`select`、`toggle`、`toggle-group`、`separator` | `components/ui/` | shadcn/ui |

**测试重点**：
- 加粗按钮 click → `editorBridge.applyFormatting({ bold: true })` 被调用
- 选中加粗文字 → 加粗按钮显示 active 状态
- 字体切换 → `docx-editor` 正确应用字体

### 4.3 Branch: `wt/phase2-document` — 文档管理

**依赖**: `wt/phase2-editor`（`editorBridge.save()`）+ `wt/phase1-tauri-fs`

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 2.3a | `useDocument` — 打开/保存/另存为流程 | `features/document/hooks/useDocument.ts` | [FRS F-011~013](../requirements/requirements-functional.md) |
| 2.3b | `useRecentFiles` — 最近文件列表 | `features/document/hooks/useRecentFiles.ts` | [FRS F-014](../requirements/requirements-functional.md) |
| 2.3c | `DocumentTitleBar` — 文件名 + 修改标记 `●` | `features/document/components/DocumentTitleBar.tsx` | [FRS F-142](../requirements/requirements-functional.md) |
| 2.3d | 关闭提示：`useDocument` + `onCloseRequested` | `pages/WorkspacePage.tsx` | [FRS F-143](../requirements/requirements-functional.md) |
| 2.3e | 文件对话框集成（Tauri dialog plugin） | `features/document/hooks/useDocument.ts` | [error-states.md §2.1, §2.2](../docs/error-states.md) |
| 2.3f | 错误处理：文档损坏/超大文档/保存失败 | `features/document/components/` | [error-states.md §2.1, §2.2, §2.7](../docs/error-states.md) |

**测试重点**：
- mock Tauri dialog → 选择文件 → `open_docx` 调用 → 编辑器显示内容
- 修改文档 → `isDirty = true` → TitleBar 显示 `●`
- Ctrl+S → `save_docx` 调用
- 关闭未保存文档 → 弹出保存提示
- 打开损坏文件 → 显示错误页（见 error-states §2.1）

### 4.4 Branch: `wt/phase2-outline-ruler` — 大纲/标尺/缩放

**依赖**: `wt/phase2-editor`

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 2.4a | `OutlinePanel` 从文档提取标题树 + 点击跳转 | `features/editor/components/OutlinePanel.tsx` | [FRS F-065](../requirements/requirements-functional.md) |
| 2.4b | `Ruler` 水平/垂直标尺 | `features/editor/components/Ruler.tsx` | [FRS F-066](../requirements/requirements-functional.md) |
| 2.4c | `ZoomControl` — 缩放滑块 + Ctrl+滚轮 | `features/page-layout/components/ZoomControl.tsx` | [FRS F-064](../requirements/requirements-functional.md) |

**测试重点**：
- 多标题文档 → 大纲面板显示层级树
- 点击大纲标题 → 编辑器滚动到对应位置
- Ctrl+滚轮 → 缩放变化 + ZoomControl 滑块同步

### Phase 2 合并验证

```bash
git merge wt/phase2-editor wt/phase2-formatting wt/phase2-document wt/phase2-outline-ruler

# 手动验证流程
# 1. 启动 → 空白编辑器
# 2. 输入文字 → 选中 → 加粗 → 格式工具栏高亮
# 3. Ctrl+S → 文件对话框 → 保存
# 4. 关闭 → 重新打开 → 内容一致
```

---

## 5. Phase 3 — Agent 集成（4 worktree 并行）

> **目标**：pi agent 子进程 + 前端 Agent 交互
> **时长**：5 天（并行）
> **前置**：Phase 2 完成 + API Key 已配置

### 5.1 Branch: `wt/phase3-pi-backend` — pi 子进程管理

**依赖**: Phase 1 Tauri 后端

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 3.1a | `pi/mod.rs` — spawn/kill/stdin/stdout 通信 | `src-tauri/src/pi/mod.rs` | [TSS §5.1](../requirements/requirements-technical.md) |
| 3.1b | 状态机：NotInstalled → Stopped → Idle → Streaming → Dead | `src-tauri/src/pi/mod.rs` | [TSS §5.1 状态机图](../requirements/requirements-technical.md) |
| 3.1c | stdout 读取 loop（tokio task）→ JSONL parse → `emit()` | `src-tauri/src/pi/mod.rs` | [TSS §4.1](../requirements/requirements-technical.md) |
| 3.1d | 消息队列：`pending: VecDeque<(Context, Mode)>` | `src-tauri/src/pi/mod.rs` | [TSS §5.2](../requirements/requirements-technical.md) |
| 3.1e | 崩溃重启（最多 3 次/分钟） | `src-tauri/src/pi/mod.rs` | [TSS §5.1](../requirements/requirements-technical.md) |
| 3.1f | 空闲超时（5 分钟无交互 → kill） | `src-tauri/src/pi/mod.rs` | [TSS §5.1](../requirements/requirements-technical.md) |
| 3.1g | `commands/pi_agent.rs` — `pi_spawn/pi_send/pi_abort/pi_get_status/pi_test_connection` | `commands/pi_agent.rs` | [tauri-commands.md §3](../docs/modules/tauri-commands.md) |
| 3.1h | Tauri Event 类型：`pi:text_delta` / `pi:tool_call` / `pi:agent_end` / `pi:error` | `src-tauri/src/pi/mod.rs` | [TSS §4.1](../requirements/requirements-technical.md) |
| 3.1i | Session 管理：`--session <doc_hash>` | `src-tauri/src/pi/` | [TSS §5.3](../requirements/requirements-technical.md) |

**测试重点**：
- pi spawn → 进程 PID 存在 → `pi_get_status` 返回 `Running`
- stdin 写入 JSON → stdout 输出 JSONL → Event `pi:text_delta` 被 emit
- SIGKILL pi → 自动重启 → 前端收到 `pi:error` + 恢复通知
- 空闲 5 分钟 → 进程退出 → `pi_get_status` 返回 `Stopped`

### 5.2 Branch: `wt/phase3-agent-chat` — AgentSidebar + 流式对话

**依赖**: `wt/phase3-pi-backend`（Event 类型）+ Phase 2（useEditorBridge）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 3.2a | `useAgentSession` — 会话生命周期 | `features/agent/hooks/useAgentSession.ts` | [stores.md §3](../docs/modules/stores.md) |
| 3.2b | Tauri Event 监听 → `useAgentStore` 更新 | `features/agent/hooks/useAgentSession.ts` | [stores.md §3 消息追加流程](../docs/modules/stores.md) |
| 3.2c | `AgentSidebar` 消息列表（用户/Agent 气泡） | `features/agent/components/AgentSidebar.tsx` | [FRS F-056](../requirements/requirements-functional.md) |
| 3.2d | 流式渲染：Markdown 增量显示 + 打字动画 | `features/agent/components/AgentSidebar.tsx` | [TSS §4.2](../requirements/requirements-technical.md) |
| 3.2e | 中断/重试：打断按钮 + 重试机制 | `features/agent/components/AgentSidebar.tsx` | [error-states.md §2.5](../docs/error-states.md) |
| 3.2f | 错误状态：未配置/Provider 不可用/崩溃 | `features/agent/components/AgentSidebar.tsx` | [error-states.md §2.3~2.6](../docs/error-states.md) |
| 3.2g | `useAgentContext` — 文档上下文采集 | `features/agent/hooks/useAgentContext.ts` | [TSS §4.4.1](../requirements/requirements-technical.md) |
| 3.2h | 自由模式 vs 文档模式切换 | `features/agent/hooks/useAgentSession.ts` | [TSS §4.4.2](../requirements/requirements-technical.md) |

**测试重点**：
- 发送消息 → `pi:text_delta` 事件 → AgentSidebar 增量显示
- `pi:agent_end` → 消息 complete + status 变 `ready`
- 未配置 API Key → Agent 按钮禁用 + 底部提示条
- Provider 超时 → 错误对话框 + 重试按钮

### 5.3 Branch: `wt/phase3-cmd-palette` — 命令面板

**依赖**: `wt/phase3-agent-chat`（`useAgentSession`）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 3.3a | `CommandPalette` — Cmd+K 唤起命令面板 | `features/agent/components/CommandPalette.tsx` | [FRS F-050](../requirements/requirements-functional.md) |
| 3.3b | 预设动作列表（润色/扩写/摘要/翻译/解释/修复语法/风格转换） | `features/agent/components/CommandPalette.tsx` | [FRS F-051](../requirements/requirements-functional.md) |
| 3.3c | 自定义指令输入（自由文本） | `features/agent/components/CommandPalette.tsx` | [FRS F-05B](../requirements/requirements-functional.md) |
| 3.3d | `QuickActions` — 快捷操作按钮组 | `features/agent/components/QuickActions.tsx` | [FRS F-051](../requirements/requirements-functional.md) |
| 3.3e | 无文档时文档操作类命令置灰 | `features/agent/components/CommandPalette.tsx` | [TSS §4.4.2](../requirements/requirements-technical.md) |
| 3.3f | 排队显示（"排队中 (#N)"） | `features/agent/components/CommandPalette.tsx` | [TSS §4.4.3](../requirements/requirements-technical.md) |

**测试重点**：
- Cmd+K → 命令面板弹出 → 输入焦点
- 选择"润色" → 光标处有选区 → AI Action request 发送
- 无选区时选择"润色" → 提示"请先选择文本"
- Esc → 命令面板关闭

### 5.4 Branch: `wt/phase3-agent-actions` — Agent 动作执行

**依赖**: `wt/phase3-agent-chat`（`useAgentSession`）+ Phase 2（`useEditorBridge`）

| # | 任务 | 产出文件 | 参考文档 |
|---|------|---------|----------|
| 3.4a | `useAgentCommands` — Agent 响应解析 + `DocumentAgent.executeCommands()` | `features/agent/hooks/useAgentCommands.ts` | [TSS §4.2](../requirements/requirements-technical.md) |
| 3.4b | `SuggestionPopover` — Agent 建议预览/接受/拒绝 | `features/agent/components/SuggestionPopover.tsx` | [FRS F-121](../requirements/requirements-functional.md) |
| 3.4c | 润色/翻译/扩写/风格转换 → `replaceRange()` | `features/agent/hooks/useAgentCommands.ts` | [TSS §4.3](../requirements/requirements-technical.md) |
| 3.4d | 全文校对 → 批量 `TrackedChangeInfo` 应用 | `features/agent/hooks/useAgentCommands.ts` | [FRS F-052](../requirements/requirements-functional.md) |
| 3.4e | 排版优化 → `executeCommands()` 批量执行 | `features/agent/hooks/useAgentCommands.ts` | [FRS F-057](../requirements/requirements-functional.md) |
| 3.4f | 错误回滚：Agent 命令执行失败 → 部分回滚 | `features/agent/hooks/useAgentCommands.ts` | [error-states.md](../docs/error-states.md) |

**测试重点**：
- Agent 返回 `newText` → `replaceRange` 被调用
- Agent 返回 `AgentCommand[]` → `executeCommands` 逐个应用
- 命令执行失败 → 编辑器状态不变（原子性）
- SuggestionPopover：接受 → 应用变更；拒绝 → 不变

---

## 6. Phase 4 — 完善（5 分支并行）

> **目标**：表格/引用/页面布局/审阅/模板 + 细节打磨
> **时长**：8 天（并行）
> **前置**：Phase 3 完成

### 6.1 `wt/phase4-table-refs` — 表格 + 引用元素

| # | 任务 | 参考文档 |
|---|------|----------|
| 4.1a | `InsertTableGrid` + `TableContextMenu` | [FRS F-080~086](../requirements/requirements-functional.md) |
| 4.1b | `useTableOperations` | [module-split.md §3.4](../docs/module-split.md) |
| 4.1c | `HyperlinkDialog` + `useHyperlink` | [FRS F-110](../requirements/requirements-functional.md) |
| 4.1d | `FootnoteDialog` + `useFootnote` | [FRS F-111~112](../requirements/requirements-functional.md) |

### 6.2 `wt/phase4-page-layout` — 页面布局

| # | 任务 | 参考文档 |
|---|------|----------|
| 4.2a | `PageSetupDialog`（页边距/纸张方向/大小） | [FRS F-100~102](../requirements/requirements-functional.md) |
| 4.2b | `HeaderFooterEditor` + 页码 | [FRS F-103~104](../requirements/requirements-functional.md) |
| 4.2c | `usePageSetup` | [module-split.md §3.5](../docs/module-split.md) |

### 6.3 `wt/phase4-review` — 审阅与批注

| # | 任务 | 参考文档 |
|---|------|----------|
| 4.3a | `CommentPanel` + `CommentCard` | [FRS F-120~122](../requirements/requirements-functional.md) |
| 4.3b | `useComments` | [module-split.md §3.7](../docs/module-split.md) |

### 6.4 `wt/phase4-template` — 模板变量

| # | 任务 | 参考文档 |
|---|------|----------|
| 4.4a | `VariableForm` + `useTemplateVars` | [FRS F-130~132](../requirements/requirements-functional.md) |
| 4.4b | 变量检测 + 填充 UI | [module-split.md §3.9](../docs/module-split.md) |

### 6.5 `wt/phase4-polish` — 细节打磨

| # | 任务 | 参考文档 |
|---|------|----------|
| 4.5a | 全局快捷键补全（Ctrl+F 查找替换、Ctrl+P 打印） | [FRS F-062](../requirements/requirements-functional.md) |
| 4.5b | 暗色模式切换（Tailwind dark mode） | [FRS F-060](../requirements/requirements-functional.md) |
| 4.5c | 多语言补全（所有 i18n key） | [i18n-standards.md](../docs/i18n-standards.md) |
| 4.5d | `useAutoSave` + 崩溃恢复草稿检测 | [data-persistence.md §5](../docs/data-persistence.md) |
| 4.5e | 自动更新（`tauri-plugin-updater`） | [FRS F-144](../requirements/requirements-functional.md) |
| 4.5f | 文件关联 + 系统菜单（Tauri bundle 配置） | [FRS F-140~141](../requirements/requirements-functional.md) |
| 4.5g | 粘贴格式降级提示 + 字体缺失提示 | [error-states.md §2.8~2.9](../docs/error-states.md) |
| 4.5h | 数据管理入口（清除历史/草稿/设置） | [data-persistence.md §8](../docs/data-persistence.md) |
| 4.5i | `FindReplaceDialog` + `useFindReplace` | [FRS F-026](../requirements/requirements-functional.md) |

---

## 7. CI/CD 与质量门禁

### 7.1 每个 worktree 分支的 CI 要求

```yaml
# .github/workflows/ci.yml 已配置
steps:
  - bun run typecheck    # 必须通过
  - bun run check        # Biome lint 必须通过
  - bun run test         # Vitest 必须通过
  - bun run build        # Vite build 必须通过
```

### 7.2 合并到 main 前的门禁

- [ ] 所有 Phase 内分支 CI 通过
- [ ] 合并无冲突
- [ ] `bun tauri dev` 启动无 Rust 编译错误
- [ ] 手动冒烟测试覆盖该 Phase 的验收标准
- [ ] commitlint 格式合规（`feat(scope):` / `fix(scope):`）

### 7.3 Nightly 构建

Phase 2 完成后启用 `tauri-action` 自动构建，每个成功合并的 main 分支发布 Nightly。

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| **pi agent 环境变量注入不支持** | Phase 3 阻塞 | fallback 到 `auth.json` 方案（data-persistence.md §4.2） |
| **docx-editor 不支持按页分片解析** | 超大文档性能差 | Phase 2 前确认；不支持则转为全量解析 + Web Worker 异步化 |
| **git worktree 冲突** | 合并地狱 | 每个 worktree 分支只修改其职责范围内的文件，不同分支不碰同一文件 |
| **Phase 1 store 接口变更** | 依赖分支需 rebase | 接口契约在 `stores.md` 中冻结，变更前先通知 |
| **Keychain crate 平台兼容** | Windows/Linux 问题 | Phase 1 验证三平台 |

---

## 9. 快速操作手册

```bash
# === Phase 1 ===

# 创建所有 worktree
git worktree add -b wt/phase1-stores ../Raven-p1-stores main
git worktree add -b wt/phase1-shell ../Raven-p1-shell main
git worktree add -b wt/phase1-settings ../Raven-p1-settings main
git worktree add -b wt/phase1-tauri-fs ../Raven-p1-fs main

# 开发完成后合并
cd /path/to/Raven
git merge wt/phase1-stores wt/phase1-shell wt/phase1-settings wt/phase1-tauri-fs

# 清理
git worktree remove ../Raven-p1-stores --force
git worktree remove ../Raven-p1-shell --force
git worktree remove ../Raven-p1-settings --force
git worktree remove ../Raven-p1-tauri-fs --force
git branch -d wt/phase1-stores wt/phase1-shell wt/phase1-settings wt/phase1-tauri-fs

# === Phase 2 (在 Phase 1 合并后) ===
git worktree add -b wt/phase2-editor ../Raven-p2-editor main
git worktree add -b wt/phase2-formatting ../Raven-p2-formatting main
git worktree add -b wt/phase2-document ../Raven-p2-document main
git worktree add -b wt/phase2-outline-ruler ../Raven-p2-ruler main
# ... merge 同上

# === Phase 3 ===
git worktree add -b wt/phase3-pi-backend ../Raven-p3-pi main
git worktree add -b wt/phase3-agent-chat ../Raven-p3-chat main
git worktree add -b wt/phase3-cmd-palette ../Raven-p3-cmd main
git worktree add -b wt/phase3-agent-actions ../Raven-p3-actions main

# === Phase 4 ===
git worktree add -b wt/phase4-table-refs ../Raven-p4-table main
git worktree add -b wt/phase4-page-layout ../Raven-p4-page main
git worktree add -b wt/phase4-review ../Raven-p4-review main
git worktree add -b wt/phase4-template ../Raven-p4-tpl main
git worktree add -b wt/phase4-polish ../Raven-p4-polish main
```

---

## 10. 里程碑总览

```
Week 1 (Day 1-3):
  Day 1:     Phase 0 文档修复 (串行)
  Day 2-3:   Phase 1 骨架搭建 (4 worktree 并行)
              └── 合并验证

Week 2 (Day 4-8):
  Day 4-8:   Phase 2 编辑器核心 (4 worktree 并行)
              └── 合并验证 → Nightly 构建启用

Week 3 (Day 9-13):
  Day 9-13:  Phase 3 Agent 集成 (4 worktree 并行)
              └── 合并验证 → v0.1.0-beta 发布

Week 4-5 (Day 14-21):
  Day 14-21: Phase 4 完善 (5 worktree 并行)
              └── 合并验证 → v1.0.0 RC

Week 6 (Day 22-26):
  Day 22-26: Bug 修复 + 性能优化 + 三平台测试 → v1.0.0 发布
```
