#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const [, , envFileArg, command, ...args] = process.argv;

if (!envFileArg || !command) {
  console.error("Usage: node ./scripts/with_env_file.js <env-file> <command> [args...]");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const envFilePath = path.resolve(rootDir, envFileArg);

if (!fs.existsSync(envFilePath)) {
  console.error(
    `Environment file not found: ${envFileArg}\nCreate it from the matching *.example file first.`
  );
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: rootDir,
  env: {
    ...process.env,
    CLUBCRM_ENV_FILE: envFilePath,
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
