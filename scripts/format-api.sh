#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="$ROOT_DIR/apps/api/.venv/bin/activate"

if [ ! -f "$VENV_PATH" ]; then
  echo "API virtualenv is missing. Run 'pnpm bootstrap' first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV_PATH"
cd "$ROOT_DIR"

if [ "${1:-}" = "--check" ]; then
  ruff check --config pyproject.toml apps/api/src
  exec ruff format --check apps/api/src
fi

ruff check --fix --config pyproject.toml apps/api/src
exec ruff format apps/api/src
