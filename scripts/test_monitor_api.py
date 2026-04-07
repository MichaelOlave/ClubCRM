from __future__ import annotations

import os

from common import MONITOR_API_DIR, ROOT_DIR, exec_command, require_app_venv_python


def main() -> None:
    venv_python = require_app_venv_python(MONITOR_API_DIR, "Monitor API")
    existing_python_path = os.environ.get("PYTHONPATH")
    monitor_python_path = str(MONITOR_API_DIR)
    os.environ["PYTHONPATH"] = (
        f"{monitor_python_path}{os.pathsep}{existing_python_path}"
        if existing_python_path
        else monitor_python_path
    )
    os.environ["MONITOR_DISABLE_BACKGROUND_TASKS"] = "true"
    exec_command(
        [
            str(venv_python),
            "-m",
            "unittest",
            "discover",
            "-s",
            "apps/monitor-api/tests",
            "-t",
            "apps/monitor-api",
        ],
        cwd=ROOT_DIR,
    )


if __name__ == "__main__":
    main()
