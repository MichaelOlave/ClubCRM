from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass

from src.config.settings import OrbStackSettings


@dataclass(frozen=True)
class OrbStackActionResult:
    vm_id: str
    power_state: str
    details: str


class OrbStackSSHAdapter:
    def __init__(self, settings: OrbStackSettings) -> None:
        self._settings = settings

    def _local_cli(self) -> str | None:
        return shutil.which("orbctl")

    def _has_remote_wrapper(self) -> bool:
        return bool(self._settings.ssh_host and self._settings.ssh_user)

    def _ssh_prefix(self) -> list[str]:
        if not self._has_remote_wrapper():
            return []

        command = [
            "ssh",
            "-p",
            str(self._settings.ssh_port),
            f"{self._settings.ssh_user}@{self._settings.ssh_host}",
        ]
        if self._settings.ssh_identity_file:
            command[1:1] = ["-i", self._settings.ssh_identity_file]
        return command

    def _run_command(self, command: list[str]) -> str:
        completed = subprocess.run(
            command,
            capture_output=True,
            check=False,
            text=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or "OrbStack command failed.")
        return completed.stdout.strip()

    def _run_wrapper(self, *args: str) -> str:
        if not self._has_remote_wrapper():
            raise RuntimeError("OrbStack SSH settings are not configured.")

        command = [*self._ssh_prefix(), self._settings.remote_wrapper, *args]
        return self._run_command(command)

    def _run_local(self, *args: str) -> str:
        cli_path = self._local_cli()
        if not cli_path:
            raise RuntimeError("OrbStack CLI is not available on the monitoring host.")
        return self._run_command([cli_path, *args])

    def list_vms(self) -> dict[str, str]:
        try:
            if self._has_remote_wrapper():
                raw_output = self._run_wrapper("list")
                payload = json.loads(raw_output or "[]")
                return {
                    item["name"]: item.get("status", "unknown")
                    for item in payload
                    if isinstance(item, dict) and item.get("name")
                }

            raw_output = self._run_local("list", "--format", "json")
        except RuntimeError:
            return {}

        if not raw_output:
            return {}

        payload = json.loads(raw_output)
        return {
            item["name"]: item.get("state", item.get("status", "unknown"))
            for item in payload
            if isinstance(item, dict) and item.get("name")
        }

    def power_action(self, vm_id: str, action: str) -> OrbStackActionResult:
        if self._has_remote_wrapper():
            raw_output = self._run_wrapper("power", action, vm_id)
            payload = json.loads(raw_output or "{}")
            return OrbStackActionResult(
                vm_id=payload.get("name", vm_id),
                power_state=payload.get(
                    "status",
                    (
                        "running"
                        if action == "start"
                        else "stopped" if action == "stop" else "unknown"
                    ),
                ),
                details=payload.get("details", f"{action} requested for {vm_id}."),
            )

        details = self._run_local(action, vm_id)
        info_payload = json.loads(self._run_local("info", vm_id, "--format", "json") or "{}")
        record = info_payload.get("record", {})
        return OrbStackActionResult(
            vm_id=record.get("name", vm_id),
            power_state=record.get(
                "state",
                "running" if action == "start" else "stopped" if action == "stop" else "unknown",
            ),
            details=details or f"{action} requested for {vm_id}.",
        )
