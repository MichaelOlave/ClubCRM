from __future__ import annotations

from common import ROOT_DIR, exec_api_module


def main() -> None:
    exec_api_module("ruff", "check", "apps/api/src", cwd=ROOT_DIR)


if __name__ == "__main__":
    main()
