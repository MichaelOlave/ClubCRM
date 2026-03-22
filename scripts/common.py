from __future__ import annotations

import os
import pathlib
import subprocess
import sys
from typing import Iterable


ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent
API_DIR = ROOT_DIR / "apps" / "api"
VENV_DIR = API_DIR / ".venv"
ENV_EXAMPLE_FILE = ROOT_DIR / ".env.example"
ENV_FILE = pathlib.Path(os.environ.get("CLUBCRM_ENV_FILE", ROOT_DIR / ".env"))


def load_env_file() -> None:
    if not ENV_FILE.is_file():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def ensure_env_file() -> None:
    if ENV_FILE.exists() or not ENV_EXAMPLE_FILE.exists():
        return

    ENV_FILE.write_text(ENV_EXAMPLE_FILE.read_text(encoding="utf-8"), encoding="utf-8")


def run(command: Iterable[str], *, cwd: pathlib.Path | None = None) -> None:
    subprocess.run(list(command), check=True, cwd=cwd or ROOT_DIR)


def exec_command(command: list[str], *, cwd: pathlib.Path | None = None) -> None:
    if cwd is not None:
        os.chdir(cwd)
    os.execvp(command[0], command)


def fail(message: str) -> "NoReturn":
    print(message, file=sys.stderr)
    raise SystemExit(1)
