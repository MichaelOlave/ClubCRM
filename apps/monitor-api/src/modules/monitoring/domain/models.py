from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

PowerState = Literal["running", "stopped", "unknown"]
AgentStatus = Literal["online", "offline", "stale"]
ContainerAction = Literal["start", "stop", "restart"]
VmPowerAction = Literal["start", "stop", "restart"]
KubernetesPodAction = Literal["recycle"]


@dataclass
class QueuedCommand:
    id: str
    kind: Literal["container"]
    action: ContainerAction
    container_name: str
    issued_at: datetime


@dataclass
class ContainerSnapshot:
    name: str
    status: str
    image: str | None = None


@dataclass
class VmSnapshot:
    id: str
    power_state: PowerState = "unknown"
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    last_seen_at: datetime | None = None
    last_monotonic_time: float | None = None
    containers: list[ContainerSnapshot] = field(default_factory=list)
    pending_commands: list[QueuedCommand] = field(default_factory=list)


@dataclass
class ServiceCheckPoint:
    checked_at: datetime
    available: bool
    latency_ms: float | None
    status_code: int | None
    error: str | None = None


@dataclass
class EventRecord:
    id: str
    kind: str
    severity: Literal["info", "warning", "critical"]
    message: str
    created_at: datetime
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class KubernetesNodeSnapshot:
    name: str
    status: str


@dataclass
class KubernetesPodSnapshot:
    namespace: str
    name: str
    status: str
    node_name: str | None = None


@dataclass
class KubernetesStorageClassSnapshot:
    name: str
    provisioner: str
    is_default: bool
    volume_binding_mode: str | None = None
    reclaim_policy: str | None = None


@dataclass
class KubernetesPersistentVolumeClaimSnapshot:
    namespace: str
    name: str
    status: str
    storage_class_name: str | None = None
    requested_storage: str | None = None
    volume_name: str | None = None
    volume_status: str | None = None


@dataclass
class LonghornVolumeSnapshot:
    namespace: str
    name: str
    state: str
    robustness: str
    size: str | None = None
    node_id: str | None = None
    ready: bool = False


@dataclass
class AgentCommandResult:
    command_id: str
    kind: str
    action: str
    target: str
    success: bool
    details: str | None = None
