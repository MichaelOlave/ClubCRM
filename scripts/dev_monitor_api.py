from __future__ import annotations

import os

from common import MONITOR_API_DIR, ROOT_DIR, exec_monitor_api_module, load_env_file


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()
    os.environ.setdefault("WATCHFILES_FORCE_POLLING", "true")
    exec_monitor_api_module(
        "uvicorn",
        "src.main:app",
        "--host",
        os.environ.get("MONITOR_API_HOST", "0.0.0.0"),
        "--port",
        os.environ.get("MONITOR_API_PORT", "8010"),
        "--reload",
        "--reload-dir",
        "src",
        cwd=MONITOR_API_DIR,
    )


if __name__ == "__main__":
    main()
