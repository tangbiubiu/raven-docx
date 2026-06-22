// start-dev.ts — 开发服务器启动器
// 并行启动 vite 与 react-devtools，退出时清理整个进程组
// 修复历史问题：直接 child.kill() 只能杀到 bun wrapper，真正的 vite node
// 进程会变成孤儿继续占用 1420 端口。改用 detached + 进程组 kill 解决。

import type { Subprocess } from "bun";

/** 子进程句柄 + 优雅退出标记 */
type Tracked = { proc: Subprocess; name: string };

const children: Tracked[] = [];
let cleaning = false;

function runCommand(prefix: string, command: string[]): Subprocess {
  // detached: true → setsid()，子进程成为新进程组 leader（pgid = pid）
  // 这样 process.kill(-pid) 可杀整组（含孙进程 vite node → esbuild）
  const proc = globalThis.Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
    detached: true,
  });

  pipeOutput(proc.stdout, prefix);
  pipeOutput(proc.stderr, prefix);

  return proc;
}

async function pipeOutput(stream: ReadableStream<Uint8Array>, prefix: string) {
  const decoder = new TextDecoder();
  try {
    for await (const chunk of stream) {
      console.log(`${prefix} ${decoder.decode(chunk).trimEnd()}`);
    }
  } catch {
    // 流在 cleanup 时被销毁，忽略
  }
}

/** 向进程组发送信号（负 pid = 进程组） */
function killGroup(proc: Subprocess, signal: NodeJS.Signals): boolean {
  const pid = proc.pid;
  if (pid === undefined) {
    return false;
  }
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    // 进程组已不存在（ESRCH）或权限不足（EPERM）
    // 前者说明已退出，后者回退到单进程 kill
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }
}

async function cleanup() {
  if (cleaning) {
    return;
  }
  cleaning = true;

  // 先 SIGTERM 优雅退出，给 vite/devtools 清理端口、刷新文件的机会
  for (const { proc } of children) {
    killGroup(proc, "SIGTERM");
  }

  // 等待最多 2 秒
  const deadline = Date.now() + 2000;
  await Promise.all(
    children.map(async ({ proc }) => {
      const remaining = Math.max(0, deadline - Date.now());
      await Promise.race([proc.exited, globalThis.Bun.sleep(remaining)]);
    })
  );

  // 仍在运行的，SIGKILL 强制杀整组
  for (const { proc } of children) {
    killGroup(proc, "SIGKILL");
  }

  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("beforeExit", cleanup);

children.push({
  proc: runCommand("[\x1b[33mvite\x1b[0m]", ["bun", "run", "dev:vite"]),
  name: "vite",
});
children.push({
  proc: runCommand("[\x1b[35mdevtools\x1b[0m]", ["bun", "run", "devtools"]),
  name: "devtools",
});
