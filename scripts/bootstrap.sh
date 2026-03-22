#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
VENV_DIR="$API_DIR/.venv"
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE_FILE" ]; then
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
fi

corepack enable
pnpm install --config.confirmModulesPurge=false

if [ -f "$API_DIR/requirements.txt" ]; then
  python3 -m venv "$VENV_DIR"
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  python -m pip install --no-cache-dir -r "$API_DIR/requirements.txt"

  if [ -f "$API_DIR/requirements-dev.txt" ]; then
    python -m pip install --no-cache-dir -r "$API_DIR/requirements-dev.txt"
  fi
fi

if [ -x "$VENV_DIR/bin/pre-commit" ]; then
  "$VENV_DIR/bin/pre-commit" install
fi
