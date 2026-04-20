from __future__ import annotations

from dataclasses import dataclass

import httpx
from src.config.settings import ProxmoxSettings
from src.modules.monitoring.infrastructure.vm_power import VmPowerActionResult


@dataclass(frozen=True)
class ProxmoxVmRecord:
    vm_id: str
    proxmox_vmid: int
    node: str
    resource_type: str
    power_state: str


class ProxmoxVmPowerAdapter:
    def __init__(self, settings: ProxmoxSettings) -> None:
        self._settings = settings

    def _is_configured(self) -> bool:
        return bool(
            self._settings.base_url and self._settings.token_id and self._settings.token_secret
        )

    def _headers(self) -> dict[str, str]:
        if not self._is_configured():
            raise RuntimeError("Proxmox settings are not configured.")

        return {
            "Authorization": (
                f"PVEAPIToken={self._settings.token_id}={self._settings.token_secret}"
            )
        }

    def _base_api_url(self) -> str:
        if not self._settings.base_url:
            raise RuntimeError("Proxmox base URL is not configured.")

        return f"{self._settings.base_url.rstrip('/')}/api2/json"

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self._base_api_url(),
            headers=self._headers(),
            timeout=self._settings.timeout_seconds,
            verify=self._settings.verify_tls,
        )

    def _fetch_vm_records(self) -> list[ProxmoxVmRecord]:
        if not self._is_configured():
            return []

        with self._client() as client:
            response = client.get("/cluster/resources", params={"type": "vm"})
            response.raise_for_status()
            payload = response.json().get("data", [])

        records: list[ProxmoxVmRecord] = []
        for item in payload:
            if not isinstance(item, dict):
                continue

            resource_type = str(item.get("type", "")).strip()
            if resource_type not in {"qemu", "lxc"}:
                continue

            vmid = item.get("vmid")
            node = str(item.get("node", "")).strip()
            name = str(item.get("name", "")).strip()
            status = str(item.get("status", "unknown")).strip() or "unknown"

            if vmid is None or not node:
                continue

            records.append(
                ProxmoxVmRecord(
                    vm_id=name or str(vmid),
                    proxmox_vmid=int(vmid),
                    node=node,
                    resource_type=resource_type,
                    power_state=status,
                )
            )

        return records

    def _resolve_vm(self, vm_id: str) -> ProxmoxVmRecord:
        normalized_vm_id = vm_id.strip()
        for record in self._fetch_vm_records():
            if record.vm_id == normalized_vm_id or str(record.proxmox_vmid) == normalized_vm_id:
                return record

        raise RuntimeError(f"Proxmox VM '{vm_id}' was not found.")

    def list_vms(self) -> dict[str, str]:
        try:
            return {record.vm_id: record.power_state for record in self._fetch_vm_records()}
        except (RuntimeError, httpx.HTTPError):
            return {}

    def power_action(self, vm_id: str, action: str) -> VmPowerActionResult:
        record = self._resolve_vm(vm_id)
        proxmox_action = "reboot" if action == "restart" else action

        with self._client() as client:
            response = client.post(
                f"/nodes/{record.node}/{record.resource_type}/{record.proxmox_vmid}/status/{proxmox_action}"
            )
            response.raise_for_status()
            payload = response.json().get("data")

        return VmPowerActionResult(
            vm_id=record.vm_id,
            power_state="running" if action in {"start", "restart"} else "stopped",
            details=(
                f"Proxmox {proxmox_action} requested for {record.vm_id}"
                + (f" ({payload})" if payload else ".")
            ),
        )
