// raven-docx/officecli.ts — OfficeCLI runner + rels 规范化 (M2)
// Reference: .dev/plan/wps-benchmark/officecli-m2-spec.md §3、§5
//
// 安全边界:
// - spawnSync(bin, args) 参数数组,不经 shell,杜绝注入。
// - 所有调用方只操作 RAVEN_DOCX_PATH(当前文档临时文件),不接受任意路径。
// - 用 batch 单进程模式:一次调用即 open→add→save,立即落盘、不留 resident
//   (spike 实测:add 走 resident 异步落盘 2-10s,扩展直读会读到旧内容)。

import { spawnSync } from "node:child_process";
import JSZip from "jszip";

/** officecli 单次调用超时(ms)/ per-call timeout */
const OFFICECLI_TIMEOUT_MS = 30_000;

export type OfficeCliResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

/**
 * 无 shell 跑 officecli batch。
 *
 * @param docPath  目标 docx 路径(只允许 RAVEN_DOCX_PATH)
 * @param commands batch 命令数组,形如 [{command:"add", parent:"/body", type:"equation", props:{...}}]
 */
export function runOfficeCliBatch(
  docPath: string,
  commands: unknown[]
): OfficeCliResult {
  const bin = process.env.RAVEN_OFFICECLI_BIN;
  if (!bin) {
    return {
      ok: false,
      stdout: "",
      stderr: "officecli 未安装(RAVEN_OFFICECLI_BIN 未设置)",
    };
  }
  const r = spawnSync(
    bin,
    ["batch", docPath, "--commands", JSON.stringify(commands)],
    {
      timeout: OFFICECLI_TIMEOUT_MS,
      encoding: "utf8",
    }
  );
  if (r.error) {
    const errno = r.error as NodeJS.ErrnoException;
    const reason =
      errno.code === "ETIMEDOUT"
        ? `超时(${OFFICECLI_TIMEOUT_MS}ms)`
        : errno.message;
    return { ok: false, stdout: "", stderr: `officecli 执行失败: ${reason}` };
  }
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

/**
 * 规范化 docx 全部 `_rels/*.rels` 的 Target 为相对路径。
 *
 * officecli 写非标准绝对 Target(如 `Target="/media/image.png"`、`Target="/word/styles.xml"`),
 * docx-editor-core 按相对路径解析会丢图片/引用(spike 已验证)。规则(按 rels part 所在目录):
 * - `word/_rels/*.rels`(targets 相对 word/):`/word/xxx`→`xxx`、`/media/xxx`→`media/xxx`、`/xxx`→`xxx`
 * - 根 `_rels/.rels`(targets 相对包根):`/word/document.xml`→`word/document.xml`(保留 word/ 前缀)
 * 无变化时原样返回同一引用(避免无谓重打包)。
 */
export async function normalizeRels(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(buffer);
  const relsNames = Object.keys(zip.files).filter(
    (name) => name.includes("_rels/") && name.endsWith(".rels")
  );
  let changed = false;
  for (const name of relsNames) {
    const file = zip.file(name);
    if (!file) {
      continue;
    }
    const content = await file.async("string");
    // word/_rels 下的 targets 相对 word/ 目录,去前导斜杠后再去 word/ 前缀;
    // 其余(根 _rels/.rels 等)仅去前导斜杠。
    const isWordRels = name.startsWith("word/_rels/");
    const fixed = content.replace(/Target="\/([^"]*)"/g, (_m, p1: string) => {
      const t =
        isWordRels && p1.startsWith("word/") ? p1.slice("word/".length) : p1;
      return `Target="${t}"`;
    });
    if (fixed !== content) {
      changed = true;
      zip.file(name, fixed);
    }
  }
  if (!changed) {
    return buffer;
  }
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
