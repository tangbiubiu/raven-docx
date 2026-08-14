# OfficeCLI 接入计划

> 状态:待实施(已决策引入,许可证 Apache-2.0 已核实)
> 定位:agent 的文档操作后端,处理 docx-editor-core 无法覆盖的能力(LaTeX 公式/mermaid 图/图表/OLE/表单/域全集/书签题注)

## 1. 目标与边界

- **不引入 AGPL**(已决策)。OfficeCLI 单二进制,Apache-2.0,无依赖。
- **替换现有 agent 后端**:DocxReviewer(docx-editor-core)→ OfficeCLI。同步链路(临时文件 + reload)**原样保留**(wps-benchmark.md §2.3)。
- **安全边界不变**:pi 仍 `--exclude-tools bash`;OfficeCLI 通过 Rust Tauri 命令调用,不走 shell。

## 2. 保真 spike(第一步,先行验证)

**目的**:验证 docx-editor-core 序列化 → OfficeCLI 编辑 → 重解析的往返无损(两套独立 OOXML 实现,可能互相丢细节)。

**步骤**:

1. 下载 officecli 二进制(macOS arm64),放临时目录。
2. 取真实文档(含图片/表格/修订的 .docx 样本)。
3. 回环测试:
   - docx-editor-core `parseDocx` + `repackDocx` → 文件 A
   - `officecli open A` → `add`(插入一个脚注/公式/表格)→ `close`
   - docx-editor-core `parseDocx` 重新解析 → 比对:正文/表格/图片/修订/样式是否丢失
4. 重点测:图片(media parts)、表格(hMerge/列操作)、修订(ins/del marks)、样式、页眉页脚。
5. **通过标准**:内容无丢失、结构无损坏、Word 能正常打开。

**结果导向**:通过 → 继续 §3;失败 → 缩小 OfficeCLI 使用范围(只做纯文本类操作)或退回扩展 DocxReviewer。

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
3. 读回:命令结束后读临时文件 → `reloadFromTemp`(现有命令)→ 编辑器重载。
4. 返回:`{ stdout, stderr, exit_code, dirty }` 摘要给 agent。

**关键点**:

- **无 shell**:`Command::new` 直接 spawn 二进制,参数不经过 shell,杜绝注入。
- **锁**:执行期间标记文档 busy(禁止并发编辑/自动保存),防止人机同时写。
- **session 管理**:officecli 有 resident session(open/close);命令内部做 open → 子命令 → close 一次性收尾,或按文档缓存 session(待 spike 定)。
- **二进制定位**:Tauri sidecar 打包(`src-tauri/binaries/officecli`),或首次运行下载到 app data 目录(待定)。

## 4. agent 工具暴露(pi 扩展)

在 `src-tauri/resources/pi-extensions/raven-docx/index.ts` 新增工具(与现有 insert_paragraph 并列):

| 工具 | 作用 | 走 |
| --- | --- | --- |
| `officecli_run` | 通用:执行任意 officecli 子命令(参数透传) | officecli_exec |
| `insert_equation` | LaTeX 公式 | officecli add ... equation |
| `insert_diagram` | mermaid 图 | officecli add ... diagram |
| `insert_chart` | 图表 | officecli add ... chart |
| `insert_bookmark` / `add_caption` / `cross_reference` | 书签/题注/交叉引用 | officecli |
| `set_columns`(备选) | 分栏(若 P0 自研路径失败) | officecli sections |

> 设计取向:**暴露一个通用的 `officecli_run`**(完整表达力)+ **少量语义化高频工具**(公式/图/图表),平衡灵活性与可控性。

## 5. 能力归属(哪些走 OfficeCLI)

| 能力 | 归属 |
| --- | --- |
| LaTeX 公式 | OfficeCLI(库 math 节点无 LaTeX 输入) |
| mermaid 图 | OfficeCLI(库无) |
| 图表 | OfficeCLI(库无 chart 节点) |
| OLE | OfficeCLI(库无) |
| 表单/域全集(22 类型) | OfficeCLI(库只有 field 节点) |
| 书签/题注/交叉引用 | OfficeCLI(agent 按需);UI 层自写 field 命令(roadmap P1) |
| 分栏 | 库自研(P0);OfficeCLI sections 作备选 |

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
| 通用 officecli_run 误用 | 参数白名单(禁止路径越界)+ busy 锁 + 命令日志审计 |

## 8. 里程碑

1. **M1 保真 spike**(§2):往返无损验证 → go/no-go。
2. **M2 officecli_exec 命令**(§3):Rust 实现 + 单测。
3. **M3 agent 工具**(§4):`officecli_run` + 公式/图/图表工具。
4. **M4 打包**(§6):sidecar 集成 + 构建验证。
