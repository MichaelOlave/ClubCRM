from __future__ import annotations

import os

from common import API_DIR, ROOT_DIR, exec_api_module, load_env_file, run_api_module


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()
    # Apply the checked-in schema before serving live database-backed routes.
    run_api_module("alembic", "upgrade", "head", cwd=API_DIR)
    # Load local relational demo data without duplicating rows on each restart.
    run_api_module("src.infrastructure.postgres.seed", cwd=API_DIR)
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
