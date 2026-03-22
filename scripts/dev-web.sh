#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/load-env.sh"

cd "$ROOT_DIR"
exec pnpm --filter web exec next dev --hostname 0.0.0.0
