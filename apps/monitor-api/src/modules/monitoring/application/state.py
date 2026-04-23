from __future__ import annotations

from collections import deque
from datetime import UTC, datetime
from itertools import count
from typing import Any
from uuid import uuid4

from src.modules.monitoring.application.demo import serialize_demo_snapshot
from src.modules.monitoring.domain.models import (
    AgentCommandResult,
    ContainerSnapshot,
    EventRecord,
    KubernetesNodeSnapshot,
    KubernetesPersistentVolumeClaimSnapshot,
    KubernetesPodSnapshot,
    KubernetesStorageClassSnapshot,
    LonghornVolumeSnapshot,
    QueuedCommand,
    ServiceCheckPoint,
    VmSnapshot,
)


class MonitoringState:
    def __init__(
        self,
        *,
        target_vms: list[str],
        history_limit: int,
        event_limit: int,
        stale_after_seconds: float,
        latency_spike_threshold_ms: float,
        synthetic_target_url: str,
    ) -> None:
        self._target_vm_ids = set(target_vms)
        self._history_limit = history_limit
        self._event_limit = event_limit
        self._stale_after_seconds = stale_after_seconds
        self._latency_spike_threshold_ms = latency_spike_threshold_ms
        self._synthetic_target_url = synthetic_target_url
        self._event_sequence = count(1)
        self._vms: dict[str, VmSnapshot] = {vm_id: VmSnapshot(id=vm_id) for vm_id in target_vms}
        self._service_history: deque[ServiceCheckPoint] = deque(maxlen=history_limit)
        self._events: deque[EventRecord] = deque(maxlen=event_limit)
        self._kubernetes_nodes: list[KubernetesNodeSnapshot] = []
        self._kubernetes_pods: list[KubernetesPodSnapshot] = []
        self._kubernetes_storage_classes: list[KubernetesStorageClassSnapshot] = []
        self._kubernetes_persistent_volume_claims: list[
            KubernetesPersistentVolumeClaimSnapshot
        ] = []
        self._kubernetes_longhorn_volumes: list[LonghornVolumeSnapshot] = []
        self._kubernetes_connected = False
        self._kubernetes_source = "unavailable"
        self._kubernetes_updated_at: datetime | None = None
        self._last_service_available: bool | None = None
        self._last_latency_spike = False

    def _now(self) -> datetime:
        return datetime.now(UTC)

    def _ensure_vm(self, vm_id: str) -> VmSnapshot:
        vm = self._vms.get(vm_id)
        if vm is None:
            vm = VmSnapshot(id=vm_id)
            self._vms[vm_id] = vm
        return vm

    def _append_event(
        self,
        *,
        kind: str,
        severity: str,
        message: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._events.appendleft(
            EventRecord(
                id=f"evt-{next(self._event_sequence)}",
                kind=kind,
                severity=severity,  # type: ignore[arg-type]
                message=message,
                created_at=self._now(),
                metadata=metadata or {},
            )
        )

    def _current_agent_status(self, vm: VmSnapshot) -> str:
        if vm.last_seen_at is None:
            return "offline"

        age = (self._now() - vm.last_seen_at).total_seconds()
        if age > self._stale_after_seconds:
            return "stale"
        return "online"

    async def record_vm_power_states(self, states: dict[str, str]) -> None:
        for vm_id, power_state in states.items():
            if vm_id not in self._target_vm_ids:
                continue

            vm = self._ensure_vm(vm_id)
            if vm.power_state != power_state:
                self._append_event(
                    kind="vm-power",
                    severity="warning" if power_state != "running" else "info",
                    message=f"{vm_id} power state changed to {power_state}.",
                    metadata={"vm_id": vm_id, "power_state": power_state},
                )
            vm.power_state = power_state  # type: ignore[assignment]
            if power_state != "running":
                vm.cpu_percent = 0.0
                vm.memory_percent = 0.0
                vm.containers = []

    async def record_vm_power_action(self, vm_id: str, action: str, power_state: str) -> None:
        vm = self._ensure_vm(vm_id)
        vm.power_state = power_state  # type: ignore[assignment]
        self._append_event(
            kind="vm-control",
            severity="warning" if action == "stop" else "info",
            message=f"{action.title()} requested for {vm_id}.",
            metadata={"vm_id": vm_id, "action": action, "power_state": power_state},
        )

    async def queue_container_action(
        self,
        vm_id: str,
        container_name: str,
        action: str,
    ) -> dict[str, Any]:
        vm = self._ensure_vm(vm_id)
        command = QueuedCommand(
            id=f"cmd-{uuid4().hex[:10]}",
            kind="container",
            action=action,  # type: ignore[arg-type]
            container_name=container_name,
            issued_at=self._now(),
        )
        vm.pending_commands.append(command)
        self._append_event(
            kind="container-control",
            severity="warning",
            message=f"{action.title()} queued for container {container_name} on {vm_id}.",
            metadata={
                "vm_id": vm_id,
                "container_name": container_name,
                "action": action,
                "command_id": command.id,
            },
        )
        return self._serialize_command(command)

    async def record_agent_command_results(
        self,
        vm_id: str,
        results: list[AgentCommandResult],
    ) -> None:
        for result in results:
            self._append_event(
                kind="container-result",
                severity="info" if result.success else "critical",
                message=(
                    f"{result.action.title()} {'succeeded' if result.success else 'failed'} "
                    f"for {result.target} on {vm_id}."
                ),
                metadata={
                    "vm_id": vm_id,
                    "command_id": result.command_id,
                    "target": result.target,
                    "action": result.action,
                    "details": result.details,
                },
            )

    async def record_heartbeat(
        self,
        *,
        vm_id: str,
        cpu_percent: float,
        memory_percent: float,
        monotonic_time: float | None,
        containers: list[ContainerSnapshot],
        command_results: list[AgentCommandResult],
    ) -> list[dict[str, Any]]:
        vm = self._ensure_vm(vm_id)
        previous_status = self._current_agent_status(vm)
        previous_containers = {container.name: container.status for container in vm.containers}

        vm.cpu_percent = cpu_percent
        vm.memory_percent = memory_percent
        vm.last_seen_at = self._now()
        vm.last_monotonic_time = monotonic_time
        vm.containers = containers

        if previous_status != "online":
            self._append_event(
                kind="agent",
                severity="info",
                message=f"{vm_id} agent reported healthy telemetry.",
                metadata={"vm_id": vm_id},
            )

        for container in containers:
            previous_container_status = previous_containers.get(container.name)
            if previous_container_status and previous_container_status != container.status:
                self._append_event(
                    kind="container-state",
                    severity="warning" if container.status != "running" else "info",
                    message=f"{container.name} on {vm_id} changed to {container.status}.",
                    metadata={
                        "vm_id": vm_id,
                        "container_name": container.name,
                        "status": container.status,
                    },
                )

        await self.record_agent_command_results(vm_id, command_results)

        commands = [self._serialize_command(command) for command in vm.pending_commands]
        vm.pending_commands = []
        return commands

    async def record_synthetic_check(
        self,
        *,
        available: bool,
        latency_ms: float | None,
        status_code: int | None,
        error: str | None = None,
    ) -> None:
        point = ServiceCheckPoint(
            checked_at=self._now(),
            available=available,
            latency_ms=latency_ms,
            status_code=status_code,
            error=error,
        )
        self._service_history.append(point)

        if self._last_service_available is None:
            self._last_service_available = available
        elif self._last_service_available != available:
            self._append_event(
                kind="service-availability",
                severity="critical" if not available else "info",
                message=(
                    "Synthetic monitor detected an outage."
                    if not available
                    else "Synthetic monitor detected recovery."
                ),
                metadata={"target_url": self._synthetic_target_url},
            )
            self._last_service_available = available

        is_latency_spike = bool(
            latency_ms is not None and latency_ms >= self._latency_spike_threshold_ms
        )
        if is_latency_spike and not self._last_latency_spike:
            self._append_event(
                kind="latency-spike",
                severity="warning",
                message=f"Synthetic latency spiked to {latency_ms:.0f} ms.",
                metadata={"latency_ms": latency_ms, "target_url": self._synthetic_target_url},
            )
        self._last_latency_spike = is_latency_spike

    async def record_kubernetes_snapshot(
        self,
        *,
        connected: bool,
        source: str,
        nodes: list[KubernetesNodeSnapshot],
        pods: list[KubernetesPodSnapshot],
        storage_classes: list[KubernetesStorageClassSnapshot] | None = None,
        persistent_volume_claims: list[KubernetesPersistentVolumeClaimSnapshot] | None = None,
        longhorn_volumes: list[LonghornVolumeSnapshot] | None = None,
    ) -> None:
        previous_pod_statuses = {
            f"{pod.namespace}/{pod.name}": pod.status for pod in self._kubernetes_pods
        }
        self._kubernetes_connected = connected
        self._kubernetes_source = source
        self._kubernetes_nodes = nodes
        self._kubernetes_pods = pods
        self._kubernetes_storage_classes = storage_classes or []
        self._kubernetes_persistent_volume_claims = persistent_volume_claims or []
        self._kubernetes_longhorn_volumes = longhorn_volumes or []
        self._kubernetes_updated_at = self._now()

        for pod in pods:
            key = f"{pod.namespace}/{pod.name}"
            previous_status = previous_pod_statuses.get(key)
            if previous_status and previous_status != pod.status:
                self._append_event(
                    kind="kubernetes-pod",
                    severity="warning" if pod.status != "Running" else "info",
                    message=f"Pod {key} changed to {pod.status}.",
                    metadata={"pod": key, "status": pod.status},
                )

    async def record_kubernetes_control(
        self,
        *,
        namespace: str,
        pod_name: str,
        action: str,
        success: bool,
        details: str,
    ) -> None:
        self._append_event(
            kind="kubernetes-control",
            severity="info" if success else "critical",
            message=(
                f"{action.title()} requested for pod {namespace}/{pod_name}."
                if success
                else f"{action.title()} failed for pod {namespace}/{pod_name}."
            ),
            metadata={
                "namespace": namespace,
                "pod_name": pod_name,
                "action": action,
                "details": details,
            },
        )

    def _serialize_command(self, command: QueuedCommand) -> dict[str, Any]:
        return {
            "id": command.id,
            "kind": command.kind,
            "action": command.action,
            "container_name": command.container_name,
            "issued_at": command.issued_at.isoformat(),
        }

    def _serialize_vm(self, vm: VmSnapshot) -> dict[str, Any]:
        return {
            "id": vm.id,
            "power_state": vm.power_state,
            "agent_status": self._current_agent_status(vm),
            "cpu_percent": vm.cpu_percent,
            "memory_percent": vm.memory_percent,
            "last_seen_at": vm.last_seen_at.isoformat() if vm.last_seen_at else None,
            "last_monotonic_time": vm.last_monotonic_time,
            "containers": [
                {"name": container.name, "status": container.status, "image": container.image}
                for container in vm.containers
            ],
            "pending_commands": len(vm.pending_commands),
        }

    def _serialize_service(self) -> dict[str, Any]:
        history = [
            {
                "checked_at": point.checked_at.isoformat(),
                "available": point.available,
                "latency_ms": point.latency_ms,
                "status_code": point.status_code,
                "error": point.error,
            }
            for point in self._service_history
        ]
        total_points = len(history)
        available_points = sum(1 for point in self._service_history if point.available)
        uptime_percentage = (
            round((available_points / total_points) * 100, 2) if total_points else 100.0
        )
        latest = history[-1] if history else None

        return {
            "target_url": self._synthetic_target_url,
            "status": "up" if latest is None or latest["available"] else "down",
            "uptime_percentage": uptime_percentage,
            "history": history,
            "latest": latest,
        }

    async def snapshot(self) -> dict[str, Any]:
        return {
            "service": self._serialize_service(),
            "vms": [self._serialize_vm(vm) for vm in self._vms.values()],
            "containers": {
                vm.id: [
                    {"name": container.name, "status": container.status, "image": container.image}
                    for container in vm.containers
                ]
                for vm in self._vms.values()
            },
            "kubernetes": {
                "connected": self._kubernetes_connected,
                "source": self._kubernetes_source,
                "last_updated_at": (
                    self._kubernetes_updated_at.isoformat() if self._kubernetes_updated_at else None
                ),
                "nodes": [
                    {"name": node.name, "status": node.status} for node in self._kubernetes_nodes
                ],
                "pods": [
                    {
                        "namespace": pod.namespace,
                        "name": pod.name,
                        "status": pod.status,
                        "node_name": pod.node_name,
                    }
                    for pod in self._kubernetes_pods
                ],
                "storage_classes": [
                    {
                        "name": storage_class.name,
                        "provisioner": storage_class.provisioner,
                        "is_default": storage_class.is_default,
                        "volume_binding_mode": storage_class.volume_binding_mode,
                        "reclaim_policy": storage_class.reclaim_policy,
                    }
                    for storage_class in self._kubernetes_storage_classes
                ],
                "pvcs": [
                    {
                        "namespace": persistent_volume_claim.namespace,
                        "name": persistent_volume_claim.name,
                        "status": persistent_volume_claim.status,
                        "storage_class_name": persistent_volume_claim.storage_class_name,
                        "requested_storage": persistent_volume_claim.requested_storage,
                        "volume_name": persistent_volume_claim.volume_name,
                        "volume_status": persistent_volume_claim.volume_status,
                    }
                    for persistent_volume_claim in self._kubernetes_persistent_volume_claims
                ],
                "longhorn_volumes": [
                    {
                        "namespace": volume.namespace,
                        "name": volume.name,
                        "state": volume.state,
                        "robustness": volume.robustness,
                        "size": volume.size,
                        "node_id": volume.node_id,
                        "ready": volume.ready,
                    }
                    for volume in self._kubernetes_longhorn_volumes
                ],
            },
            "demo": serialize_demo_snapshot(
                nodes=self._kubernetes_nodes,
                pods=self._kubernetes_pods,
                vms=self._vms.values(),
            ),
            "events": [
                {
                    "id": event.id,
                    "kind": event.kind,
                    "severity": event.severity,
                    "message": event.message,
                    "created_at": event.created_at.isoformat(),
                    "metadata": event.metadata,
                }
                for event in self._events
            ],
            "generated_at": self._now().isoformat(),
        }
