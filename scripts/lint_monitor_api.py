from __future__ import annotations

from common import ROOT_DIR, exec_monitor_api_module


def main() -> None:
    exec_monitor_api_module("ruff", "check", "apps/monitor-api/src", "apps/monitor-api/tests", cwd=ROOT_DIR)


if __name__ == "__main__":
    main()
