#!/usr/bin/env node
// Syncs the /docs folder and root README.md into apps/web/public/docs
// so they are available as static assets in the web app.
// This replaces sync_docs_to_web.py so that no Python installation is required
// (e.g. inside the Node-based Docker builder image).

const { cpSync, mkdirSync, copyFileSync, existsSync, rmSync } = require("fs");
const { resolve } = require("path");

const rootDir = resolve(__dirname, "..");
const docsDir = resolve(rootDir, "docs");
const readmeFile = resolve(rootDir, "README.md");
const targetDir = resolve(rootDir, "apps", "web", "public", "docs");

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

if (existsSync(docsDir)) {
  cpSync(docsDir, targetDir, { recursive: true });
  console.log(`Synced ${docsDir} to ${targetDir}`);
} else {
  console.log(`Docs directory not found at ${docsDir}`);
}

if (existsSync(readmeFile)) {
  copyFileSync(readmeFile, resolve(targetDir, "ROOT-README.md"));
  console.log(`Synced ${readmeFile} to ${resolve(targetDir, "ROOT-README.md")}`);
} else {
  console.log(`Root README.md not found at ${readmeFile}`);
}
