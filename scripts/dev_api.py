from __future__ import annotations

import os

from common import API_DIR, ROOT_DIR, exec_api_module, load_env_file


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()
    # Polling is more reliable than native filesystem events on Windows-hosted
    # bind mounts and still works fine for container-based local development.
    os.environ.setdefault("WATCHFILES_FORCE_POLLING", "true")
    exec_api_module(
        "uvicorn",
        "src.main:app",
        "--host",
        os.environ.get("API_HOST", "0.0.0.0"),
        "--port",
        os.environ.get("API_PORT", "8000"),
        "--reload",
        "--reload-dir",
        "src",
        cwd=API_DIR,
    )


if __name__ == "__main__":
    main()
