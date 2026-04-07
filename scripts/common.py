from __future__ import annotations

import os
import pathlib
import shutil
import subprocess
import sys
from collections.abc import Iterable
from typing import NoReturn

ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent
API_DIR = ROOT_DIR / "apps" / "api"
MONITOR_API_DIR = ROOT_DIR / "apps" / "monitor-api"
VENV_DIR = API_DIR / ".venv"
ENV_EXAMPLE_FILE = ROOT_DIR / ".env.example"
ENV_FILE = pathlib.Path(os.environ.get("CLUBCRM_ENV_FILE", ROOT_DIR / ".env"))
WINDOWS_BATCH_SUFFIXES = {".bat", ".cmd"}
WINDOWS_VENV_EXTENSIONS = (".exe", ".cmd", ".bat")


def load_env_file() -> None:
    if not ENV_FILE.is_file():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), _normalize_env_value(value))


def _normalize_env_value(value: str) -> str:
    normalized_value = value.strip()
    if (
        len(normalized_value) >= 2
        and normalized_value[0] == normalized_value[-1]
        and normalized_value[0] in {'"', "'"}
    ):
        return normalized_value[1:-1]

    return normalized_value


def ensure_env_file() -> None:
    if ENV_FILE.exists() or not ENV_EXAMPLE_FILE.exists():
        return

    ENV_FILE.write_text(ENV_EXAMPLE_FILE.read_text(encoding="utf-8"), encoding="utf-8")


def venv_bin_dir() -> pathlib.Path:
    return VENV_DIR / ("Scripts" if os.name == "nt" else "bin")


def app_venv_dir(app_dir: pathlib.Path) -> pathlib.Path:
    return app_dir / ".venv"


def venv_bin_dir_for(app_dir: pathlib.Path) -> pathlib.Path:
    return app_venv_dir(app_dir) / ("Scripts" if os.name == "nt" else "bin")


def venv_executable(name: str) -> pathlib.Path:
    scripts_dir = venv_bin_dir()
    return _resolve_venv_executable(scripts_dir, name)


def venv_executable_for(app_dir: pathlib.Path, name: str) -> pathlib.Path:
    scripts_dir = venv_bin_dir_for(app_dir)
    return _resolve_venv_executable(scripts_dir, name)


def _resolve_venv_executable(scripts_dir: pathlib.Path, name: str) -> pathlib.Path:
    if pathlib.Path(name).suffix:
        candidates = [scripts_dir / name]
    else:
        candidates = [scripts_dir / name]

        if os.name == "nt":
            candidates = [
                scripts_dir / f"{name}{extension}"
                for extension in WINDOWS_VENV_EXTENSIONS
            ] + candidates

    for candidate in candidates:
        if candidate.is_file():
            return candidate

    return candidates[0]


def require_api_venv_python() -> pathlib.Path:
    venv_python = require_app_venv_python(API_DIR, "API")
    return venv_python


def require_app_venv_python(app_dir: pathlib.Path, label: str) -> pathlib.Path:
    venv_python = venv_executable_for(app_dir, "python")
    if not venv_python.is_file():
        fail(f"{label} virtualenv is missing. Run the matching bootstrap command first.")

    return venv_python


def _prepare_command(command: Iterable[str]) -> list[str]:
    prepared_command = list(command)
    if not prepared_command:
        raise ValueError("command must not be empty")

    executable = prepared_command[0]
    executable_path = pathlib.Path(executable)

    if executable_path.parent != pathlib.Path("."):
        resolved_executable = executable
    else:
        resolved_executable = shutil.which(executable) or executable

    if os.name != "nt":
        prepared_command[0] = resolved_executable
        return prepared_command

    executable_suffix = pathlib.Path(resolved_executable).suffix.lower()
    if executable_suffix in WINDOWS_BATCH_SUFFIXES:
        return ["cmd", "/c", resolved_executable, *prepared_command[1:]]

    prepared_command[0] = resolved_executable
    return prepared_command


def run(command: Iterable[str], *, cwd: pathlib.Path | None = None) -> None:
    subprocess.run(_prepare_command(command), check=True, cwd=cwd or ROOT_DIR)


def exec_command(command: Iterable[str], *, cwd: pathlib.Path | None = None) -> NoReturn:
    completed_process = subprocess.run(
        _prepare_command(command),
        check=False,
        cwd=cwd or ROOT_DIR,
    )
    raise SystemExit(completed_process.returncode)


def exec_api_module(module: str, *args: str, cwd: pathlib.Path | None = None) -> NoReturn:
    venv_python = require_app_venv_python(API_DIR, "API")
    exec_command([str(venv_python), "-m", module, *args], cwd=cwd)


def run_api_module(module: str, *args: str, cwd: pathlib.Path | None = None) -> None:
    venv_python = require_app_venv_python(API_DIR, "API")
    run([str(venv_python), "-m", module, *args], cwd=cwd)


def exec_monitor_api_module(module: str, *args: str, cwd: pathlib.Path | None = None) -> NoReturn:
    venv_python = require_app_venv_python(MONITOR_API_DIR, "Monitor API")
    exec_command([str(venv_python), "-m", module, *args], cwd=cwd)


def run_monitor_api_module(module: str, *args: str, cwd: pathlib.Path | None = None) -> None:
    venv_python = require_app_venv_python(MONITOR_API_DIR, "Monitor API")
    run([str(venv_python), "-m", module, *args], cwd=cwd)


def fail(message: str) -> NoReturn:
    print(message, file=sys.stderr)
    raise SystemExit(1)
