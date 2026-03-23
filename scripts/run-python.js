#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node ./scripts/run-python.js <script> [args...]");
  process.exit(1);
}

const candidates =
  process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
        { command: "python3", prefix: [] },
        { command: "python", prefix: [] },
        { command: "py", prefix: ["-3"] },
      ];

let foundInterpreter = false;

for (const candidate of candidates) {
  const result = spawnSync(candidate.command, [...candidate.prefix, ...args], {
    stdio: "inherit",
  });

  if (!result.error) {
    foundInterpreter = true;

    if (typeof result.status === "number") {
      process.exit(result.status);
    }

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }

    process.exit(0);
  }

  if (result.error.code !== "ENOENT") {
    throw result.error;
  }
}

if (!foundInterpreter) {
  console.error("Could not find a Python interpreter. Tried python3, python, and py -3.");
}

process.exit(1);
