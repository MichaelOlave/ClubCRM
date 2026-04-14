from __future__ import annotations

import os

from common import ROOT_DIR, exec_command, load_env_file


def main() -> None:
    os.chdir(ROOT_DIR)
    load_env_file()
    exec_command(["pnpm", "--filter", "monitor-web", "exec", "vitest", "run"], cwd=ROOT_DIR)


if __name__ == "__main__":
    main()
