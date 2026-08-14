# OfficeCLI 接入计划

> 状态:✅ M2 已完成(2026-08-14);M3 agent 工具已随 M2 落地;M4 打包待正式发布时验证。
> ⚠️ **§3(Rust Tauri 命令设计)已被 `officecli-m2-spec.md` §1 取代**:officecli 改为 pi 扩展(Node)直接 spawn(扩展在独立 pi 进程,调不了 Tauri 命令);Rust 只负责打包二进制 + 注入 `RAVEN_OFFICECLI_BIN` env。M1 spike 已完成(见 officecli-spike-results.md),图表/mermaid/OLE 排除。
> 定位:agent 的文档操作后端,处理 docx-editor-core 无法覆盖的能力(LaTeX 公式/mermaid 图/图表/OLE/表单/域全集/书签题注)

## 1. 目标与边界

- **不引入 AGPL**(已决策)。OfficeCLI 单二进制,Apache-2.0,无依赖。
- **增补第二编辑引擎**(非替换):现有 DocxReviewer 工具全部保留,OfficeCLI 作为第二引擎增补(白名单语义工具)。两引擎共享同一临时文件 + reload 链路(wps-benchmark.md §2.3)。
- **安全边界不变**:pi 仍 `--exclude-tools bash`;OfficeCLI 通过 Rust Tauri 命令调用,不走 shell。

## 2. 保真 spike(已完成,验范围)

**定位(已拍板)**:OfficeCLI 已决定引入;spike 不是 go/no-go 门,而是**验证接入范围**。

**✅ 已完成(2026-08-14)**:结果见 `officecli-spike-results.md`。结论:公式/域/脚注/表格安全;图片因 officecli rel 路径 bug 丢失(可修);图表/mermaid 原生形状因库不支持而排除。

## 3. `officecli_exec` Tauri 命令设计(Rust)

**签名**(示意):

```rust
#[tauri::command]
async fn officecli_exec(
    args: Vec<String>,          // officecli 子命令参数
    // 内部:当前文档 buffer 由命令内部从 store/temp 获取
) -> Result<OfficeCliResult, String>
```

**流程**:

1. flush:把编辑器当前 buffer 落到临时文件 `RAVEN_DOCX_PATH`(复用现有 agent 回环逻辑)。
2. 执行:`Command::new(officecli_bin).args(args)` 无 shell spawn,捕获 stdout/stderr。
3. 读回:命令结束后读临时文件 → `reloadFromTemp`(现有命令)→ 编辑器重载;**同时重建/失效 DocxReviewer 缓存与 PM view**(与 insert_paragraph 的 cache 失效逻辑一致,否则双引擎往返会静默损坏)。
4. 返回:`{ stdout, stderr, exit_code, dirty }` 摘要给 agent。

**关键点**:

- **无 shell**:`Command::new` 直接 spawn 二进制,参数不经过 shell,杜绝注入。
- **锁**:执行期间标记文档 busy(禁止并发编辑/自动保存),防止人机同时写。
- **session 管理**:officecli 有 resident session(open/close);命令内部做 open → 子命令 → close 一次性收尾,或按文档缓存 session(待 spike 定)。
- **二进制定位**:Tauri sidecar 打包(`src-tauri/binaries/officecli`),或首次运行下载到 app data 目录(待定)。

## 4. agent 工具暴露(pi 扩展,白名单语义工具)

在 `src-tauri/resources/pi-extensions/raven-docx/index.ts` 新增工具(与现有 insert_paragraph 并列)。

**接口形态(已拍板):白名单语义工具,不做通用透传。** 每个工具内部固定参数/路径,agent 无法传任意路径或子命令,不暴露文件读写原语。

| 工具 | 作用 | 走 |
| --- | --- | --- |
| `insert_equation` | LaTeX 公式 | officecli add ... equation |
| `insert_diagram` | mermaid 图 | officecli add ... diagram |
| `insert_chart` | 图表 | officecli add ... chart |
| `insert_bookmark` / `add_caption` / `cross_reference` | 书签/题注/交叉引用 | officecli |

> 越权边界:工具内部**只能操作当前文档临时文件**(`RAVEN_DOCX_PATH`),不接受任意路径;officecli 的 open/close 由 `officecli_exec` 命令内部收尾,不对 agent 暴露。

## 5. 能力归属(哪些走 OfficeCLI)

| 能力 | 归属(spike 后) |
| --- | --- |
| LaTeX 公式 | ✅ OfficeCLI(oMath 往返无损) |
| 域全集(22 类型) | ✅ OfficeCLI(field 往返无损) |
| 脚注 | ✅ OfficeCLI(往返无损) |
| 表格增强 | ✅ OfficeCLI(往返无损) |
| 书签/题注/交叉引用 | ✅ OfficeCLI(文本类,预期安全待实测);UI 层自写 field 命令(roadmap P1) |
| 图片 | ✅ OfficeCLI(需 `officecli_exec` wrapper 规范化 rels,已验证修复后往返无损) |
| mermaid 图 | ❌ 排除(库不支持 wps:wsp 往返) |
| 图表 | ❌ 排除(库不支持 chart 往返) |
| OLE | ❓ 未测,同属 drawing 类,预期同图表风险 |
| 分栏 | 库自研(P0 已完成);OfficeCLI sections 作备选 |

## 6. 打包与分发

- **sidecar**:`src-tauri/tauri.conf.json` 配置 `externalBin: ["binaries/officecli"]`,构建时随应用分发。
- 版本锁定:固定 officecli 版本,升级走显式流程。
- 许可证:Apache-2.0,无分发义务。

## 7. 风险与降级

| 风险 | 应对 |
| --- | --- |
| 往返保真不达标 | 缩小 OfficeCLI 用途(纯文本/公式),其余退回 DocxReviewer 扩展 |
| officecli session 与编辑器并发 | 文档 busy 锁 + open/close 一次性收尾 |
| 二进制体积/启动慢 | sidecar 常驻或按需懒启动(待 spike 测) |
| 语义工具越权 | 工具内部只操作当前文档临时文件,不接任意路径;命令日志审计 |

## 8. 里程碑

1. **M1 保真 spike** ✅ 完成(2026-08-14,见 spike-results.md)。
2. **M2 officecli_exec 命令** ✅ 完成(2026-08-14):按 `officecli-m2-spec.md` 实现——扩展直跑 `batch`(单进程、立即落盘、无 resident)、rels 规范化(jszip 后处理)、DocxReviewer 重建;Rust 注入 `RAVEN_OFFICECLI_BIN` env。
3. **M3 agent 工具** ✅ 完成(2026-08-14):白名单语义工具 8 个(insert_equation/insert_field/insert_footnote/insert_table/insert_toc/add_bookmark/add_caption/cross_reference);insert_picture 待前端图片上传通道(§4.1)。
4. **M4 打包** ⏳ 待发布构建验证:tauri.conf.json resources 已加 `resources/officecli/*`,二进制已就位(dev 模式用 CARGO_MANIFEST_DIR 定位)。
