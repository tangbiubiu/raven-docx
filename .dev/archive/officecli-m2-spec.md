# OfficeCLI M2 实现 spec:`officecli` 白名单工具(agent 侧)

> 状态:✅ 已完成(2026-08-14)。新增 `officecli.ts`(batch runner + rels 规范化)、`index.ts` 注册 8 个白名单工具、`pi/mod.rs` 注入 `RAVEN_OFFICECLI_BIN`、tauri.conf.json 打包 officecli 二进制。验收:719 it() 全绿 + 真实二进制端到端验证(batch 写入 → rels 规范化 → validate 通过)。
> 定位:让 pi agent 通过白名单语义工具用 officecli 操作当前文档(公式/域/脚注/表格/书签题注)

## 1. 架构决策:extension 直跑,而非 Rust Tauri 命令

**结论**:officecli 由 **pi 扩展(Node)直接 spawn**,不走 Rust Tauri 命令。理由:

1. 扩展是受信 Node 代码,已有 `node:fs`(现有 `persistDoc` 就是 `writeFileSync` 写 `RAVEN_DOCX_PATH`),天然能 `child_process.spawnSync`。
2. 扩展**无法直接调用 Tauri 命令**(它在独立 pi 进程,不在 webview;现有通信只有 `ctx.ui.notify` + 文件 + env)。
3. 文档 buffer 已由前端 `prepareTempDoc()` 落盘(RAVEN_DOCX_PATH),扩展直接操作该文件即可,无需 Rust 中转。

> 原 officecli-integration.md §3 的"Rust Tauri 命令"设计被本 spec 取代。Rust 只负责:①打包二进制 ②spawn pi 时注入二进制路径 env。

## 2. 二进制打包与定位

1. **打包**:`src-tauri/tauri.conf.json` 的 `bundle.resources` 增加 officecli 二进制(与现有 `resources/pi/*` 并列),或 `externalBin` sidecar(二选一,推荐 `resources` 更简单):

   ```json
   "resources": ["resources/pi/*", "resources/officecli/officecli"]
   ```

   二进制放 `src-tauri/resources/officecli/officecli`(构建时按平台替换 mac-arm64/mac-x64/win-x64…)。
2. **注入 env**:`src-tauri/src/pi/mod.rs` `spawn()` 里,与 `RAVEN_DOCX_PATH` 并列注入:

   ```rust
   cmd.env("RAVEN_OFFICECLI_BIN", &officecli_bin_path);
   ```

   路径用 `tauri::api::path::resource_dir()` 解析。

## 3. 扩展侧 officecli 模块(新文件)

`src-tauri/resources/pi-extensions/raven-docx/officecli.ts`:

```ts
import { spawnSync } from "node:child_process";

/** 无 shell 跑 officecli,带超时,返回 stdout/stderr/exitCode */
export function runOfficeCli(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const bin = process.env.RAVEN_OFFICECLI_BIN;
  if (!bin) return { ok: false, stdout: "", stderr: "RAVEN_OFFICECLI_BIN 未设置" };
  const r = spawnSync(bin, args, { timeout: 30_000, encoding: "utf8" });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
```

- **无 shell**:`spawnSync(bin, args)` 参数数组,不经过 shell,杜绝注入。
- 所有工具**只操作 `RAVEN_DOCX_PATH`**(当前文档临时文件),不接受任意路径。

## 4. 白名单语义工具(参数校验后拼固定参数)

在 `index.ts` 注册(与现有 insert_paragraph 并列),每个工具:

1. 校验参数(类型/必填/长度)。
2. 用 `RAVEN_DOCX_PATH` + 校验过的参数拼 officecli args。
3. `runOfficeCli(args)` → 成功则 `persistDoc()` 语义(标记 dirty)→ 前端 reload(现有 `documentDirty` 流程)。
4. 失败返回 stderr 给 agent。

| 工具 | officecli 命令(示意) | 参数校验 |
| --- | --- | --- |
| `insert_equation` | `add <doc> /body --type equation --prop mode=inline\|display --prop formula="..."` | formula 非空,≤500 字符 |
| `insert_toc` | `add <doc> / --type toc`(生成目录域) | 已决策:目录走 OfficeCLI(`generateTOC` 实测往返回滚) |
| `insert_field` | `add <doc> / --type field --prop fieldType=page\|date\|...` | fieldType ∈ 枚举 |
| `insert_footnote` | `add <doc> /body/p[N] --type footnote --prop text="..."` | text 非空 |
| `insert_table` | `add <doc> / --type table --prop rows=N --prop cols=M` | 1≤rows,cols≤20 |
| `insert_picture` | `add <doc> /body/p[N] --type picture --prop src=...` | src 由工具内部定位(见 §4.1),不接受外部路径 |
| `add_bookmark` | `add <doc> ... --type bookmark ...` | 名称校验 |
| `add_caption` / `cross_reference` | `add <doc> ... --type field --prop fieldType=seq/ref --prop name=...` | 名称校验 |

> **不做通用 `officecli_run` 透传**(已拍板):agent 拿不到任意子命令/路径,无文件读写原语越权。

### 4.1 图片 src 的来源(安全关键)

`insert_picture` 需要图片文件路径,但**不接受 agent 传任意路径**。方案:

- agent 先通过现有图片上传通道(前端 `InsertImageButton` 的文件对话框)把图片落盘到受控目录;
- 工具只接受该受控目录下的文件名(白名单),拼成完整路径;
- 或 agent 提供图片,前端先转存到 temp 目录再通知工具。

> 实现时可先只接非图片工具,图片工具等 rel 规范化 + 图片上传通道就绪后再开。
> 目录已决策走 OfficeCLI(`insert_toc`);WPS 数字样式文档缺 TOCHeading/TOC1 样式,generateTOC 插入被编辑器往返回滚(见 progress.md)。

## 5. rels 规范化(后处理,spike 已验证)

officecli 写非标准 rel `Target="/media/image.png"`(前导斜杠),docx-editor-core 解析不了。**每次 officecli 写后**做后处理:

- 规则:遍历 docx 内所有 `_rels/*.rels`,把 `Target="/word/xxx"` → `"xxx"`、`Target="/media/xxx"` → `"media/xxx"`、`Target="/xxx"` → `"xxx"`(去前导斜杠 + 去 `/word/` 前缀,恢复相对 `word/` 的路径)。
- 实现(二选一):
  - (a) 用 officecli 自身 `raw` / `raw-set` 改 `word/_rels/document.xml.rels` 等 part;
  - (b) 扩展内用 `jszip`(pi 依赖树已有,docx-editor-core 传递依赖)读改写。
- spike 已验证:规范化后图片 `<a:blip>` + `media/image.png` + rel 三项全保留,往返无损。

## 6. busy 锁与 reload(复用现有,不改)

- agent 会话期间前端已设 `isEditorLocked=true`(`prepareTempDoc`),编辑器不响应人工编辑。
- 工具写文件后:沿用 `persistDoc` → `documentDirty` → 前端 `reloadDocument` → `reloadFromTemp` 的现有链路。
- **双引擎缓存失效**:reload 后必须重建 DocxReviewer 桥(与 insert_paragraph 的 `rebuildBridgeAndTools()` 同类逻辑,spike 通过标准第 3 环)。officecli 写后如果 DocxReviewer 还要再编辑,先重建 bridge。

## 7. 错误处理与降级

| 场景 | 处理 |
| --- | --- |
| 二进制缺失(env 未设) | 返回明确错误,工具报"officecli 未安装" |
| officecli 非 0 退出 | 返回 stderr 给 agent,不改文档 |
| 超时(30s) | kill + 返回超时错误 |
| 图表/mermaid/OLE 请求 | 工具白名单内**不提供**(spike 结论:库不支持,排除) |

## 8. 验收标准

1. `insert_equation`(LaTeX)→ 文档出现 oMath,reload 后编辑器显示公式。
2. `insert_field`(page/date)→ 出现域,reload 后保留。
3. `insert_footnote` → 脚注出现,reload 后保留。
4. `insert_table` → 表格出现,reload 后保留。
5. `insert_picture` → 图片出现,**rels 规范化后** reload 图片不丢。
6. officecli 写后 DocxReviewer 再编辑(insert_paragraph)→ 无静默损坏(缓存失效生效)。
7. 全程无 shell、无任意路径(安全审查项)。

## 9. 文件清单

- 新增:`src-tauri/resources/pi-extensions/raven-docx/officecli.ts`(runner + rel 规范化)
- 改:`src-tauri/resources/pi-extensions/raven-docx/index.ts`(注册白名单工具)
- 改:`src-tauri/src/pi/mod.rs`(注入 `RAVEN_OFFICECLI_BIN` env)
- 改:`src-tauri/tauri.conf.json`(bundle officecli 二进制)
- 新增二进制:`src-tauri/resources/officecli/officecli`(mac-arm64 等)
