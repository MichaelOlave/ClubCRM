from __future__ import annotations

import sys

from common import ROOT_DIR, exec_api_module, run_api_module


def main() -> None:
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] != "--check"):
        raise SystemExit("Usage: format_api.py [--check]")

    if len(sys.argv) == 2:
        run_api_module("ruff", "check", "--config", "pyproject.toml", "apps/api/src", cwd=ROOT_DIR)
        exec_api_module("ruff", "format", "--check", "apps/api/src", cwd=ROOT_DIR)

    run_api_module("ruff", "check", "--fix", "--config", "pyproject.toml", "apps/api/src", cwd=ROOT_DIR)
    exec_api_module("ruff", "format", "apps/api/src", cwd=ROOT_DIR)


if __name__ == "__main__":
    main()
