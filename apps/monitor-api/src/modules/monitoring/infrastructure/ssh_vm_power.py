from __future__ import annotations

import json
import subprocess

from src.config.settings import SshVmPowerSettings
from src.modules.monitoring.infrastructure.vm_power import VmPowerActionResult


class SshVmPowerAdapter:
    def __init__(self, settings: SshVmPowerSettings) -> None:
        self._settings = settings

    def _is_configured(self) -> bool:
        return bool(
            self._settings.ssh_host
            and self._settings.ssh_user
            and self._settings.remote_wrapper
        )

    def _command_prefix(self) -> list[str]:
        if not self._is_configured():
            raise RuntimeError("SSH VM power settings are not configured.")

        command = [
            "ssh",
            "-p",
            str(self._settings.ssh_port),
            f"{self._settings.ssh_user}@{self._settings.ssh_host}",
        ]
        if self._settings.ssh_identity_file:
            command[1:1] = ["-i", self._settings.ssh_identity_file]
        return command

    def _run_wrapper(self, *args: str) -> str:
        command = [*self._command_prefix(), self._settings.remote_wrapper, *args]
        completed = subprocess.run(
            command,
            capture_output=True,
            check=False,
            text=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or "SSH VM power command failed.")
        return completed.stdout.strip()

    def list_vms(self) -> dict[str, str]:
        if not self._is_configured():
            return {}

        try:
            raw_output = self._run_wrapper("list")
            payload = json.loads(raw_output or "[]")
        except (RuntimeError, json.JSONDecodeError):
            return {}

        return {
            item["name"]: item.get("status", "unknown")
            for item in payload
            if isinstance(item, dict) and item.get("name")
        }

    def power_action(self, vm_id: str, action: str) -> VmPowerActionResult:
        raw_output = self._run_wrapper("power", action, vm_id)
        payload = json.loads(raw_output or "{}")

        return VmPowerActionResult(
            vm_id=payload.get("name", vm_id),
            power_state=payload.get(
                "status",
                "running" if action in {"start", "restart"} else "stopped",
            ),
            details=payload.get("details", f"{action} requested for {vm_id}."),
        )
