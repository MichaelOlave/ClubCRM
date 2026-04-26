from __future__ import annotations

from src.modules.cluster.domain.models import (
    ClusterEvent,
    ReplicaHealthChanged,
    VolumeAttached,
    VolumeDetached,
    VolumeFaulted,
    VolumeHealthChanged,
    VolumeReattached,
    VolumeReplicaState,
    VolumeState,
)


def parse_volume(raw: dict) -> VolumeState:
    metadata = raw.get("metadata") or {}
    spec = raw.get("spec") or {}
    status = raw.get("status") or {}
    kubernetes_status = status.get("kubernetesStatus") or {}

    pvc_namespace = _optional_string(
        kubernetes_status,
        "namespace",
    ) or _optional_string(spec, "pvcNamespace")
    pvc_name = _optional_string(kubernetes_status, "pvcName") or _optional_string(spec, "pvcName")
    workload_namespace = _optional_string(kubernetes_status, "workloadsStatusNamespace") or (
        pvc_namespace
    )
    workload_name = _optional_string(kubernetes_status, "workloadName")
    workload_kind = _optional_string(kubernetes_status, "workloadType")
    attachment_node = _optional_string(status, "currentNodeID")
    state = _normalized_state(status)
    robustness = _optional_string(status, "robustness") or "unknown"
    health = _volume_health(state, robustness)

    return VolumeState(
        name=_optional_string(metadata, "name") or "",
        pvc_namespace=pvc_namespace,
        pvc_name=pvc_name,
        workload_namespace=workload_namespace,
        workload_name=workload_name,
        workload_kind=workload_kind,
        attachment_node=attachment_node,
        state=state,
        robustness=robustness,
        health=health,
    )


def parse_replica(raw: dict) -> VolumeReplicaState:
    metadata = raw.get("metadata") or {}
    spec = raw.get("spec") or {}
    status = raw.get("status") or {}

    mode = (
        _optional_string(status, "mode")
        or _optional_string(status, "currentState")
        or "unknown"
    )

    return VolumeReplicaState(
        name=_optional_string(metadata, "name") or "",
        volume_name=_optional_string(spec, "volumeName") or "",
        node_name=_optional_string(spec, "nodeID"),
        mode=mode,
        health=_replica_health(status),
    )


def diff_volume(
    previous: VolumeState | None,
    current: VolumeState,
    ts: float,
) -> list[ClusterEvent]:
    events: list[ClusterEvent] = []

    if previous is None:
        if current.attachment_node is not None:
            events.append(
                VolumeAttached(
                    volume=current.name,
                    node_name=current.attachment_node,
                    pvc_namespace=current.pvc_namespace,
                    pvc_name=current.pvc_name,
                    workload_namespace=current.workload_namespace,
                    workload_name=current.workload_name,
                    ts=ts,
                )
            )
        if _is_faulted(current):
            events.append(
                VolumeFaulted(
                    volume=current.name,
                    node_name=current.attachment_node,
                    robustness=current.robustness,
                    ts=ts,
                )
            )
        return events

    if previous.attachment_node != current.attachment_node:
        if previous.attachment_node and current.attachment_node:
            events.append(
                VolumeReattached(
                    volume=current.name,
                    from_node=previous.attachment_node,
                    to_node=current.attachment_node,
                    pvc_namespace=current.pvc_namespace,
                    pvc_name=current.pvc_name,
                    workload_namespace=current.workload_namespace,
                    workload_name=current.workload_name,
                    ts=ts,
                )
            )
        elif current.attachment_node:
            events.append(
                VolumeAttached(
                    volume=current.name,
                    node_name=current.attachment_node,
                    pvc_namespace=current.pvc_namespace,
                    pvc_name=current.pvc_name,
                    workload_namespace=current.workload_namespace,
                    workload_name=current.workload_name,
                    ts=ts,
                )
            )
        elif previous.attachment_node:
            events.append(
                VolumeDetached(
                    volume=current.name,
                    from_node=previous.attachment_node,
                    pvc_namespace=current.pvc_namespace,
                    pvc_name=current.pvc_name,
                    workload_namespace=current.workload_namespace,
                    workload_name=current.workload_name,
                    ts=ts,
                )
            )

    if previous.health != current.health:
        events.append(
            VolumeHealthChanged(
                volume=current.name,
                node_name=current.attachment_node,
                from_health=previous.health,
                to_health=current.health,
                ts=ts,
            )
        )

    if not _is_faulted(previous) and _is_faulted(current):
        events.append(
            VolumeFaulted(
                volume=current.name,
                node_name=current.attachment_node,
                robustness=current.robustness,
                ts=ts,
            )
        )

    return events


def diff_replica(
    previous: VolumeReplicaState | None,
    current: VolumeReplicaState,
    ts: float,
) -> list[ClusterEvent]:
    if previous is None or previous.health == current.health:
        return []

    return [
        ReplicaHealthChanged(
            volume=current.volume_name,
            replica=current.name,
            node_name=current.node_name,
            from_health=previous.health,
            to_health=current.health,
            ts=ts,
        )
    ]


def _optional_string(raw: dict, key: str) -> str | None:
    value = raw.get(key)
    return value if isinstance(value, str) and value else None


def _normalized_state(status: dict) -> str:
    state = _optional_string(status, "state")
    if state:
        return state.lower()
    if _optional_string(status, "currentNodeID"):
        return "attached"
    return "detached"


def _volume_health(state: str, robustness: str) -> str:
    normalized = f"{state} {robustness}".lower()
    if "fault" in normalized:
        return "faulted"
    if "degrad" in normalized:
        return "degraded"
    if "attach" in normalized:
        return "healthy"
    if "detach" in normalized:
        return "detached"
    return robustness.lower() if robustness else "unknown"


def _replica_health(status: dict) -> str:
    mode = (_optional_string(status, "mode") or "").upper()
    current_state = (_optional_string(status, "currentState") or "").upper()
    started = status.get("started")
    failed_at = _optional_string(status, "failedAt")
    healthy_at = _optional_string(status, "healthyAt")

    if failed_at:
        return "faulted"
    if mode in {"ERR", "ERROR"} or current_state == "ERROR":
        return "faulted"
    if current_state == "STOPPED" or started is False:
        return "unknown"
    if mode == "RW" or (current_state == "RUNNING" and healthy_at):
        return "healthy"
    if healthy_at:
        return "healthy"
    if mode in {"WO", "UNKNOWN"}:
        return "degraded"
    return "unknown"


def _is_faulted(volume: VolumeState) -> bool:
    return volume.health == "faulted" or "fault" in volume.robustness.lower()
