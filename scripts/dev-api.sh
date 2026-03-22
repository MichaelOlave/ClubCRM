#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="$ROOT_DIR/apps/api/.venv/bin/activate"

# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/load-env.sh"

if [ ! -f "$VENV_PATH" ]; then
  echo "API virtualenv is missing. Run 'pnpm bootstrap' first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV_PATH"
cd "$ROOT_DIR/apps/api"
exec uvicorn src.main:app --host "${API_HOST:-0.0.0.0}" --port "${API_PORT:-8000}" --reload
