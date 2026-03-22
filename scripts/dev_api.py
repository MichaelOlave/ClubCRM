from __future__ import annotations

import os

from common import API_DIR, ROOT_DIR, VENV_DIR, exec_command, fail, load_env_file


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()

    venv_python = VENV_DIR / "bin" / "python"
    if not venv_python.is_file():
        fail("API virtualenv is missing. Run 'pnpm bootstrap' first.")

    exec_command(
        [
            str(venv_python),
            "-m",
            "uvicorn",
            "src.main:app",
            "--host",
            os.environ.get("API_HOST", "0.0.0.0"),
            "--port",
            os.environ.get("API_PORT", "8000"),
            "--reload",
        ],
        cwd=API_DIR,
    )


if __name__ == "__main__":
    main()
