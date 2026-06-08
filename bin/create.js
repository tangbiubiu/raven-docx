#!/usr/bin/env node

import { execSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const templateDir = resolve(__dirname, "..");

// Get project name from command line arguments
const projectName = process.argv[2];

if (!projectName) {
  console.error("Please specify the project directory:");
  console.error("  bun create tauri-react-app <project-directory>");
  console.error();
  console.error("For example:");
  console.error("  bun create tauri-react-app my-app");
  process.exit(1);
}

const targetDir = resolve(process.cwd(), projectName);

// Check if directory already exists
if (existsSync(targetDir)) {
  console.error(`Error: Directory "${projectName}" already exists.`);
  process.exit(1);
}

console.log(`Creating a new Tauri + React app in ${targetDir}...`);
console.log();

// Create the target directory
mkdirSync(targetDir, { recursive: true });

// Files and directories to exclude from copying
const excludeList = [
  "node_modules",
  ".git",
  "target",
  "bin",
  "bun.lock",
  "Cargo.lock",
  ".DS_Store",
];

// Copy template files
cpSync(templateDir, targetDir, {
  recursive: true,
  filter: (src) => {
    const name = basename(src);
    return !excludeList.includes(name);
  },
});

// Remove the bin directory from the copied template
const binDir = join(targetDir, "bin");
if (existsSync(binDir)) {
  rmSync(binDir, { recursive: true });
}

console.log("Installing dependencies...");
console.log();

// Detect package manager (prefer bun, fallback to npm)
let packageManager = "npm";
try {
  execSync("bun --version", { stdio: "ignore" });
  packageManager = "bun";
} catch {
  // bun not available, use npm
}

// Run install
const install = spawn(packageManager, ["install"], {
  cwd: targetDir,
  stdio: "inherit",
  shell: true,
});

install.on("close", (code) => {
  if (code !== 0) {
    console.error("Failed to install dependencies.");
    process.exit(1);
  }

  console.log();
  console.log("Success! Created", projectName, "at", targetDir);
  console.log();
  console.log("Inside that directory, you can run several commands:");
  console.log();
  console.log(`  ${packageManager} run dev`);
  console.log("    Starts the development server.");
  console.log();
  console.log(`  ${packageManager} tauri build`);
  console.log("    Builds the app for production.");
  console.log();
  console.log("We suggest that you begin by typing:");
  console.log();
  console.log(`  cd ${projectName}`);
  console.log(`  ${packageManager} run dev`);
  console.log();
});
