from __future__ import annotations

import contextlib
import hashlib
import json
import os
import shutil
import sys
import time
from collections.abc import Iterable
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
    ROOT_DIR / ".npmrc",
    ROOT_DIR / "package.json",
    ROOT_DIR / "pnpm-lock.yaml",
    ROOT_DIR / "pnpm-workspace.yaml",
    ROOT_DIR / "apps" / "web" / "package.json",
    API_DIR / "requirements.txt",
    API_DIR / "requirements-dev.txt",
)
NODE_WORKSPACE_MANIFESTS = (
    ROOT_DIR / "package.json",
    ROOT_DIR / "apps" / "web" / "package.json",
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


def _node_package_names(package_manifest: Path) -> Iterable[str]:
    try:
        package_data = json.loads(package_manifest.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return ()

    package_names: list[str] = []

    for section_name in ("dependencies", "devDependencies"):
        section = package_data.get(section_name, {})
        if isinstance(section, dict):
            package_names.extend(
                package_name
                for package_name, package_version in section.items()
                if isinstance(package_name, str) and isinstance(package_version, str)
            )

    return package_names


def _node_package_manifest_path(package_manifest: Path, package_name: str) -> Path:
    return package_manifest.parent / "node_modules" / Path(package_name) / "package.json"


def node_dependencies_ready() -> bool:
    # The devcontainer persists root and app node_modules in separate volumes, so
    # a shallow check can miss newly added web packages after a branch switch.
    for package_manifest in NODE_WORKSPACE_MANIFESTS:
        if not package_manifest.is_file():
            return False

        for package_name in _node_package_names(package_manifest):
            if not _node_package_manifest_path(package_manifest, package_name).is_file():
                return False

    return True


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


def find_uv() -> str | None:
    return shutil.which("uv")


def ensure_venv_pip(venv_python: Path) -> None:
    run([str(venv_python), "-m", "ensurepip", "--upgrade"])


def install_python_requirements(venv_python: Path, requirements_file: Path, *, uv: str | None) -> None:
    if uv is not None:
        run(
            [
                uv,
                "pip",
                "install",
                "--python",
                str(venv_python),
                "-r",
                str(requirements_file),
            ]
        )
        return

    run(
        [
            str(venv_python),
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "-r",
            str(requirements_file),
        ]
    )


def main() -> None:
    os.chdir(ROOT_DIR)
    ensure_env_file()

    uv = find_uv()
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

            if uv is None:
                print(
                    "uv is not installed in this environment; "
                    "bootstrapping API Python dependencies with pip instead."
                )
                ensure_venv_pip(venv_python)

            install_python_requirements(venv_python, requirements, uv=uv)

            if requirements_dev.is_file():
                install_python_requirements(venv_python, requirements_dev, uv=uv)

        install_pre_commit_hook(venv_python, requirements_dev)
        BOOTSTRAP_STATE_FILE.write_text(f"{fingerprint}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
