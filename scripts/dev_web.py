from __future__ import annotations

import os
import time

from bootstrap import BOOTSTRAP_STATE_FILE, bootstrap_fingerprint, node_dependencies_ready
from common import ROOT_DIR, exec_command, fail, load_env_file

BOOTSTRAP_WAIT_TIMEOUT_SECONDS = 300
BOOTSTRAP_POLL_INTERVAL_SECONDS = 0.5


def wait_for_node_dependencies() -> None:
    deadline = time.monotonic() + BOOTSTRAP_WAIT_TIMEOUT_SECONDS
    fingerprint = bootstrap_fingerprint()

    while time.monotonic() < deadline:
        if (
            BOOTSTRAP_STATE_FILE.is_file()
            and BOOTSTRAP_STATE_FILE.read_text(encoding="utf-8").strip() == fingerprint
            and node_dependencies_ready()
        ):
            return

        time.sleep(BOOTSTRAP_POLL_INTERVAL_SECONDS)

    fail(
        "Node dependencies are not ready. "
        "Wait for bootstrap to finish or run 'pnpm bootstrap' first."
    )


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()
    wait_for_node_dependencies()
    exec_command(
        ["pnpm", "--filter", "web", "exec", "next", "dev", "--hostname", "0.0.0.0"],
        cwd=ROOT_DIR,
    )


if __name__ == "__main__":
    main()
