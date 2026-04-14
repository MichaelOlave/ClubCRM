from __future__ import annotations

from common import ROOT_DIR, exec_monitor_api_module


def main() -> None:
    exec_monitor_api_module("compileall", "apps/monitor-api/src", cwd=ROOT_DIR)


if __name__ == "__main__":
    main()
