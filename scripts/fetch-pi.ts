// fetch-pi.ts — 下载并解压内置 pi 二进制到 src-tauri/resources/pi/
//
// pi coding agent: https://github.com/earendil-works/pi
// 平台范围：macOS arm64 + Windows x64（其余平台留扩展点）
//
// 用法：
//   bun run fetch-pi              # 拉取当前平台
//   bun run fetch-pi --target aarch64-apple-darwin
//   bun run fetch-pi --target x86_64-pc-windows-msvc
//
// 流程：下载 → 校验 SHA256（对比 SHA256SUMS）→ 解压到 src-tauri/resources/pi/

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const PI_VERSION = "0.79.9";
const RELEASE_BASE = `https://github.com/earendil-works/pi/releases/download/v${PI_VERSION}`;

// 顶层正则：SHA256SUMS 行格式 "<hash>  <filename>"
const SHA256SUM_LINE = /\s+/;

// Rust target triple → pi release asset
const TARGETS: Record<string, { asset: string; binaryName: string }> = {
  "aarch64-apple-darwin": {
    asset: "pi-darwin-arm64.tar.gz",
    binaryName: "pi",
  },
  "x86_64-pc-windows-msvc": {
    asset: "pi-windows-x64.zip",
    binaryName: "pi.exe",
  },
};

const RESOURCES_DIR = join(
  import.meta.dir,
  "..",
  "src-tauri",
  "resources",
  "pi"
);

function getCurrentTarget(): string {
  const { platform, arch } = process;
  if (platform === "darwin" && arch === "arm64") {
    return "aarch64-apple-darwin";
  }
  if (platform === "darwin" && arch === "x64") {
    return "x86_64-pc-darwin";
  }
  if (platform === "win32" && arch === "x64") {
    return "x86_64-pc-windows-msvc";
  }
  if (platform === "linux" && arch === "x64") {
    return "x86_64-unknown-linux-gnu";
  }
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

function parseArgs(): string | null {
  const idx = process.argv.indexOf("--target");
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return null;
}

async function download(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`下载失败 ${url}: HTTP ${resp.status}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function fetchSha256Sums(): Promise<Record<string, string>> {
  const buf = await download(`${RELEASE_BASE}/SHA256SUMS`);
  const text = buf.toString("utf-8");
  const map: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split(SHA256SUM_LINE);
    if (parts.length === 2) {
      map[parts[1]] = parts[0];
    }
  }
  return map;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** spawn 子进程并等待退出，非零退出码时 reject */
function runSpawn(cmd: string, args: string[], label: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const proc = spawn(cmd, args, { stdio: "inherit" });
  proc.on("close", (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`${label} 失败，退出码 ${code}`));
    }
  });
  proc.on("error", reject);
  return promise;
}

async function extractTarGz(
  archivePath: string,
  destDir: string
): Promise<void> {
  await mkdir(destDir, { recursive: true });
  await runSpawn("tar", ["-xzf", archivePath, "-C", destDir], "tar 解压");
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  if (process.platform === "win32") {
    await runSpawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`,
      ],
      "Expand-Archive"
    );
  } else {
    await runSpawn("unzip", ["-o", archivePath, "-d", destDir], "unzip 解压");
  }
}

/** 在目录中递归查找指定文件名的文件 */
async function findBinary(
  dir: string,
  binaryName: string
): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isFile() && entry.name === binaryName) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = await findBinary(fullPath, binaryName);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function resolveTarget() {
  const target = parseArgs() ?? getCurrentTarget();
  const config = TARGETS[target];
  if (!config) {
    console.error(`不支持的目标平台: ${target}`);
    console.error(`支持的平台: ${Object.keys(TARGETS).join(", ")}`);
    process.exit(1);
  }
  console.log(`[fetch-pi] 目标平台: ${target}`);
  console.log(`[fetch-pi] pi 版本: v${PI_VERSION}`);
  console.log(`[fetch-pi] 资产: ${config.asset}`);
  return config;
}

/** 下载资产并校验 SHA256，返回 Buffer */
async function downloadAndVerify(asset: string): Promise<Buffer> {
  console.log("[fetch-pi] 下载 SHA256SUMS...");
  const sums = await fetchSha256Sums();
  const expectedHash = sums[asset];
  if (!expectedHash) {
    console.error(`SHA256SUMS 中找不到 ${asset}`);
    console.error("可用条目:", Object.keys(sums));
    process.exit(1);
  }

  console.log(`[fetch-pi] 下载 ${asset}...`);
  const archiveBuf = await download(`${RELEASE_BASE}/${asset}`);

  const actualHash = sha256(archiveBuf);
  if (actualHash !== expectedHash) {
    console.error("SHA256 校验失败！");
    console.error(`期望: ${expectedHash}`);
    console.error(`实际: ${actualHash}`);
    process.exit(1);
  }
  console.log(`[fetch-pi] SHA256 校验通过: ${actualHash}`);
  return archiveBuf;
}

/** 解压归档到目标目录 */
async function extractArchive(
  asset: string,
  archivePath: string,
  destDir: string
): Promise<void> {
  console.log(`[fetch-pi] 解压到 ${destDir}...`);
  if (asset.endsWith(".tar.gz")) {
    await extractTarGz(archivePath, destDir);
  } else if (asset.endsWith(".zip")) {
    await extractZip(archivePath, destDir);
  } else {
    console.error(`未知归档格式: ${asset}`);
    process.exit(1);
  }
}

/** 保留运行时必需文件到临时位置，返回成功保留的文件名列表 */
async function preserveRuntimeFiles(subDir: string): Promise<string[]> {
  const preserveFiles = ["package.json"];
  const preserveDirs = ["theme"];
  const preserved: string[] = [];

  for (const name of preserveFiles) {
    const src = join(subDir, name);
    const tmp = join(RESOURCES_DIR, `${name}.tmp`);
    try {
      await copyFile(src, tmp);
      preserved.push(name);
    } catch {
      // 文件不存在可忽略
    }
  }

  for (const name of preserveDirs) {
    const src = join(subDir, name);
    const tmp = join(RESOURCES_DIR, `${name}.tmp`);
    try {
      await runSpawn("cp", ["-R", src, tmp], `cp ${name}`);
      preserved.push(name);
    } catch {
      // 目录不存在可忽略
    }
  }

  return preserved;
}

/** 从解压目录提取二进制到根，保留必要运行时文件，删除其余 */
async function extractBinary(binaryName: string): Promise<string> {
  const finalBinaryPath = join(RESOURCES_DIR, binaryName);
  const foundBinary = await findBinary(RESOURCES_DIR, binaryName);
  if (!foundBinary) {
    console.error(`解压后未找到二进制: ${binaryName}`);
    console.error("解压目录内容:");
    const entries = await readdir(RESOURCES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      console.error(`  ${entry.isDirectory() ? "d" : "f"} ${entry.name}`);
    }
    process.exit(1);
  }

  if (foundBinary !== finalBinaryPath) {
    const subDir = dirname(foundBinary);
    if (subDir !== RESOURCES_DIR) {
      // 先 copy 二进制到临时名，避免与子目录同名冲突
      const tmpPath = join(RESOURCES_DIR, `${binaryName}.tmp`);
      await copyFile(foundBinary, tmpPath);

      // 保留运行时必需文件：package.json（版本号）、theme/（主题配置）
      const preserved = await preserveRuntimeFiles(subDir);

      await rm(subDir, { recursive: true, force: true });
      await rename(tmpPath, finalBinaryPath);

      for (const name of preserved) {
        const tmp = join(RESOURCES_DIR, `${name}.tmp`);
        await rename(tmp, join(RESOURCES_DIR, name));
      }
    }
  }
  return finalBinaryPath;
}

/** 安装 raven-docx extension 的 npm 依赖（@eigenpal/docx-editor-agents） */
async function installExtensionDeps(): Promise<void> {
  const extDir = join(RESOURCES_DIR, "..", "pi-extensions", "raven-docx");
  console.log(`[fetch-pi] 安装 extension 依赖: ${extDir}`);
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const proc = spawn("bun", ["install"], { stdio: "inherit", cwd: extDir });
  proc.on("close", (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`extension 依赖安装失败，退出码 ${code}`));
    }
  });
  proc.on("error", reject);
  await promise;
  console.log("[fetch-pi] extension 依赖安装完成");
}

async function main() {
  const config = resolveTarget();

  const archiveBuf = await downloadAndVerify(config.asset);

  const tmpFile = join(tmpdir(), config.asset);
  await writeFile(tmpFile, archiveBuf);

  console.log(`[fetch-pi] 清理旧目录 ${RESOURCES_DIR}...`);
  await rm(RESOURCES_DIR, { recursive: true, force: true });

  await extractArchive(config.asset, tmpFile, RESOURCES_DIR);

  const finalBinaryPath = await extractBinary(config.binaryName);

  if (process.platform === "darwin") {
    await chmod(finalBinaryPath, 0o755);
    console.log(`[fetch-pi] 设置可执行权限: ${finalBinaryPath}`);
  }

  console.log(`[fetch-pi] 完成！二进制位于: ${finalBinaryPath}`);
  console.log(
    `[fetch-pi] 体积: ${(archiveBuf.length / 1024 / 1024).toFixed(1)} MB (压缩)`
  );

  await installExtensionDeps();
}

main().catch((err) => {
  console.error("[fetch-pi] 致命错误:", err);
  process.exit(1);
});
