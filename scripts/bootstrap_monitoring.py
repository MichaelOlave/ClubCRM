from __future__ import annotations

import os
import shutil
import sys

from common import (
    MONITOR_API_DIR,
    ROOT_DIR,
    app_venv_dir,
    ensure_env_file,
    run,
    venv_executable_for,
)


def ensure_venv_pip(venv_python: str) -> None:
    run([venv_python, "-m", "ensurepip", "--upgrade"])


def install_requirements(venv_python: str, requirements_file: str, uv: str | None) -> None:
    if uv is not None:
        run([uv, "pip", "install", "--python", venv_python, "-r", requirements_file], cwd=ROOT_DIR)
        return

    run(
        [venv_python, "-m", "pip", "install", "--disable-pip-version-check", "-r", requirements_file],
        cwd=ROOT_DIR,
    )


def main() -> None:
    os.chdir(ROOT_DIR)
    ensure_env_file()
    run(["corepack", "enable"])
    run(["pnpm", "install", "--config.confirmModulesPurge=false"])

    monitor_venv_dir = app_venv_dir(MONITOR_API_DIR)
    run([sys.executable, "-m", "venv", str(monitor_venv_dir)], cwd=ROOT_DIR)

    venv_python = str(venv_executable_for(MONITOR_API_DIR, "python"))
    uv = shutil.which("uv")
    if uv is None:
        ensure_venv_pip(venv_python)

    install_requirements(
        venv_python,
        str(MONITOR_API_DIR / "requirements.txt"),
        uv,
    )
    install_requirements(
        venv_python,
        str(MONITOR_API_DIR / "requirements-dev.txt"),
        uv,
    )


if __name__ == "__main__":
    main()
