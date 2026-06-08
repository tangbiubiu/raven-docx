// start-dev.ts
import type { Subprocess } from "bun";

const children: Subprocess[] = [];

function runCommand(prefix: string, command: string[]): Subprocess {
  const proc = globalThis.Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
  });

  pipeOutput(proc.stdout, prefix);
  pipeOutput(proc.stderr, prefix);

  return proc;
}

async function pipeOutput(stream: ReadableStream<Uint8Array>, prefix: string) {
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    console.log(`${prefix} ${decoder.decode(chunk).trimEnd()}`);
  }
}

function cleanup() {
  for (const child of children) {
    child.kill();
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

children.push(runCommand("[\x1b[33mvite\x1b[0m]", ["bun", "run", "dev:vite"]));
children.push(
  runCommand("[\x1b[35mdevtools\x1b[0m]", ["bun", "run", "devtools"])
);
