from __future__ import annotations

import contextlib
import hashlib
import os
import sys
import time
from pathlib import Path

from common import (
    API_DIR,
    ROOT_DIR,
    ensure_env_file,
    fail,
    run,
    venv_executable,
)

BOOTSTRAP_DIR = ROOT_DIR / ".pnpm-store"
BOOTSTRAP_LOCK_FILE = BOOTSTRAP_DIR / "bootstrap.lock"
BOOTSTRAP_STATE_FILE = BOOTSTRAP_DIR / "bootstrap.sha256"
BOOTSTRAP_LOCK_TIMEOUT_SECONDS = 300
BOOTSTRAP_LOCK_STALE_SECONDS = 1800
BOOTSTRAP_LOCK_POLL_INTERVAL_SECONDS = 0.5
BOOTSTRAP_INPUT_FILES = (
    ROOT_DIR / "package.json",
    ROOT_DIR / "pnpm-lock.yaml",
    ROOT_DIR / "pnpm-workspace.yaml",
    ROOT_DIR / "apps" / "web" / "package.json",
    API_DIR / "requirements.txt",
    API_DIR / "requirements-dev.txt",
)


def bootstrap_fingerprint() -> str:
    digest = hashlib.sha256()

    for path in BOOTSTRAP_INPUT_FILES:
        digest.update(path.relative_to(ROOT_DIR).as_posix().encode("utf-8"))
        digest.update(b"\0")

        if path.is_file():
            digest.update(path.read_bytes())

        digest.update(b"\0")

    return digest.hexdigest()


def node_dependencies_ready() -> bool:
    return (ROOT_DIR / "node_modules" / "prettier" / "package.json").is_file() and (
        ROOT_DIR / "apps" / "web" / "node_modules" / "next" / "package.json"
    ).is_file()


def python_dependencies_ready(
    requirements: Path, requirements_dev: Path, venv_python: Path, pre_commit: Path
) -> bool:
    if not requirements.is_file():
        return True

    if not venv_python.is_file():
        return False

    if requirements_dev.is_file() and not pre_commit.is_file():
        return False

    return True


def bootstrap_ready(
    fingerprint: str,
    requirements: Path,
    requirements_dev: Path,
    venv_python: Path,
    pre_commit: Path,
) -> bool:
    if not BOOTSTRAP_STATE_FILE.is_file():
        return False

    if BOOTSTRAP_STATE_FILE.read_text(encoding="utf-8").strip() != fingerprint:
        return False

    return node_dependencies_ready() and python_dependencies_ready(
        requirements, requirements_dev, venv_python, pre_commit
    )


@contextlib.contextmanager
def bootstrap_lock() -> None:
    BOOTSTRAP_DIR.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + BOOTSTRAP_LOCK_TIMEOUT_SECONDS

    while True:
        try:
            lock_file_descriptor = os.open(
                BOOTSTRAP_LOCK_FILE,
                os.O_CREAT | os.O_EXCL | os.O_WRONLY,
            )
        except FileExistsError:
            if _bootstrap_lock_is_stale():
                with contextlib.suppress(FileNotFoundError, PermissionError):
                    BOOTSTRAP_LOCK_FILE.unlink()
                continue

            if time.monotonic() >= deadline:
                fail(
                    "Timed out waiting for another bootstrap process to finish. "
                    "If no bootstrap is running, delete "
                    f"'{BOOTSTRAP_LOCK_FILE.relative_to(ROOT_DIR).as_posix()}'."
                )

            time.sleep(BOOTSTRAP_LOCK_POLL_INTERVAL_SECONDS)
            continue

        with os.fdopen(lock_file_descriptor, "w", encoding="utf-8") as lock_file:
            lock_file.write(f"{os.getpid()}\n")

        try:
            yield
        finally:
            with contextlib.suppress(FileNotFoundError):
                BOOTSTRAP_LOCK_FILE.unlink()

        return


def _bootstrap_lock_is_stale() -> bool:
    try:
        lock_contents = BOOTSTRAP_LOCK_FILE.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return False

    if not lock_contents:
        return True

    try:
        lock_pid = int(lock_contents.splitlines()[0])
    except ValueError:
        return True

    if not _process_exists(lock_pid):
        return True

    try:
        lock_age_seconds = time.time() - BOOTSTRAP_LOCK_FILE.stat().st_mtime
    except FileNotFoundError:
        return False

    return lock_age_seconds >= BOOTSTRAP_LOCK_STALE_SECONDS


def _process_exists(process_id: int) -> bool:
    if process_id <= 0:
        return False

    try:
        os.kill(process_id, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True

    return True


def install_pre_commit_hook(venv_python: Path, requirements_dev: Path) -> None:
    if requirements_dev.is_file() and venv_python.is_file():
        run([str(venv_python), "-m", "pre_commit", "install"])


def main() -> None:
    os.chdir(ROOT_DIR)
    ensure_env_file()

    requirements = API_DIR / "requirements.txt"
    requirements_dev = API_DIR / "requirements-dev.txt"
    venv_python = venv_executable("python")
    pre_commit = venv_executable("pre-commit")
    fingerprint = bootstrap_fingerprint()

    with bootstrap_lock():
        if bootstrap_ready(fingerprint, requirements, requirements_dev, venv_python, pre_commit):
            install_pre_commit_hook(venv_python, requirements_dev)
            return

        run(["corepack", "enable"])
        run(["pnpm", "install", "--config.confirmModulesPurge=false"])

        if requirements.is_file():
            run([sys.executable, "-m", "venv", str(venv_python.parent.parent)])
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

        install_pre_commit_hook(venv_python, requirements_dev)
        BOOTSTRAP_STATE_FILE.write_text(f"{fingerprint}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
