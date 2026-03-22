from __future__ import annotations

import os

from common import API_DIR, ROOT_DIR, VENV_DIR, ensure_env_file, run


def main() -> None:
    os.chdir(ROOT_DIR)
    ensure_env_file()

    run(["corepack", "enable"])
    run(["pnpm", "install", "--config.confirmModulesPurge=false"])

    requirements = API_DIR / "requirements.txt"
    requirements_dev = API_DIR / "requirements-dev.txt"
    venv_python = VENV_DIR / "bin" / "python"
    pre_commit = VENV_DIR / "bin" / "pre-commit"

    if requirements.is_file():
        run(["python3", "-m", "venv", str(VENV_DIR)])
        run([str(venv_python), "-m", "pip", "install", "--upgrade", "pip"])
        run(
            [
                str(venv_python),
                "-m",
                "pip",
                "install",
                "--no-cache-dir",
                "-r",
                str(requirements),
            ]
        )

        if requirements_dev.is_file():
            run(
                [
                    str(venv_python),
                    "-m",
                    "pip",
                    "install",
                    "--no-cache-dir",
                    "-r",
                    str(requirements_dev),
                ]
            )

    if pre_commit.is_file() and os.access(pre_commit, os.X_OK):
        run([str(pre_commit), "install"])


if __name__ == "__main__":
    main()
