from __future__ import annotations

import os

from common import ROOT_DIR, exec_command, load_env_file


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()
    monitor_web_port = os.environ.get("MONITOR_WEB_PORT", "3001")
    exec_command(
        [
            "pnpm",
            "--filter",
            "monitor-web",
            "exec",
            "next",
            "dev",
            "--webpack",
            "--hostname",
            "0.0.0.0",
            "--port",
            monitor_web_port,
        ],
        cwd=ROOT_DIR,
    )


if __name__ == "__main__":
    main()
