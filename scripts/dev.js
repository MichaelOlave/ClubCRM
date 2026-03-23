#!/usr/bin/env node

const { spawn } = require("node:child_process");

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const childSpecs = [
  { label: "api", args: ["dev:api"] },
  { label: "web", args: ["dev:web"] },
];
const children = [];
let exiting = false;
let shutdownSignal = null;

function stopChildren(signal = "SIGTERM") {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

function exitWithResult(code, signal) {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
}

for (const spec of childSpecs) {
  const child = spawn(pnpmCommand, spec.args, {
    stdio: "inherit",
  });

  child.on("error", (error) => {
    if (exiting || shutdownSignal) {
      return;
    }

    exiting = true;
    stopChildren();
    console.error(`Failed to start ${spec.label}: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (shutdownSignal) {
      if (
        children.every(
          (runningChild) => runningChild.exitCode !== null || runningChild.signalCode !== null
        )
      ) {
        exitWithResult(0, shutdownSignal);
      }

      return;
    }

    if (exiting) {
      return;
    }

    exiting = true;
    stopChildren();
    exitWithResult(code, signal);
  });

  children.push(child);
}

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    if (exiting || shutdownSignal) {
      return;
    }

    shutdownSignal = signal;
    stopChildren(signal);
  });
});
