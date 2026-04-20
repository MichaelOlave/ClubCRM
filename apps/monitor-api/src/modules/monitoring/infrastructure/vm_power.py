from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from src.modules.monitoring.infrastructure.orbstack import OrbStackSSHAdapter


@dataclass(frozen=True)
class VmPowerActionResult:
    vm_id: str
    power_state: str
    details: str


class VmPowerAdapter(Protocol):
    def list_vms(self) -> dict[str, str]: ...

    def power_action(self, vm_id: str, action: str) -> VmPowerActionResult: ...


class OrbStackVmPowerAdapter:
    def __init__(self, adapter: OrbStackSSHAdapter) -> None:
        self._adapter = adapter

    def list_vms(self) -> dict[str, str]:
        return self._adapter.list_vms()

    def power_action(self, vm_id: str, action: str) -> VmPowerActionResult:
        result = self._adapter.power_action(vm_id, action)
        return VmPowerActionResult(
            vm_id=result.vm_id,
            power_state=result.power_state,
            details=result.details,
        )
