from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class NodeState:
    name: str
    status: str
    roles: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"name": self.name, "status": self.status, "roles": list(self.roles)}


@dataclass(frozen=True)
class PodState:
    namespace: str
    name: str
    status: str
    node_name: str | None
    uid: str | None = None

    def to_dict(self) -> dict:
        return {
            "namespace": self.namespace,
            "name": self.name,
            "status": self.status,
            "node_name": self.node_name,
            "uid": self.uid,
        }


@dataclass(frozen=True)
class VolumeState:
    name: str
    pvc_namespace: str | None
    pvc_name: str | None
    workload_namespace: str | None
    workload_name: str | None
    workload_kind: str | None
    attachment_node: str | None
    state: str
    robustness: str
    health: str

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "pvc_namespace": self.pvc_namespace,
            "pvc_name": self.pvc_name,
            "workload_namespace": self.workload_namespace,
            "workload_name": self.workload_name,
            "workload_kind": self.workload_kind,
            "attachment_node": self.attachment_node,
            "state": self.state,
            "robustness": self.robustness,
            "health": self.health,
        }


@dataclass(frozen=True)
class VolumeReplicaState:
    name: str
    volume_name: str
    node_name: str | None
    mode: str
    health: str

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "volume_name": self.volume_name,
            "node_name": self.node_name,
            "mode": self.mode,
            "health": self.health,
        }


@dataclass(frozen=True)
class ServiceProbeState:
    service: str
    url: str
    status: Literal["unknown", "ok", "degraded", "failed"] = "unknown"
    last_checked_at: float | None = None
    last_transition_at: float | None = None
    last_latency_ms: float | None = None
    last_status_code: int | None = None
    last_error: str | None = None

    def to_dict(self) -> dict:
        return {
            "service": self.service,
            "url": self.url,
            "status": self.status,
            "last_checked_at": self.last_checked_at,
            "last_transition_at": self.last_transition_at,
            "last_latency_ms": self.last_latency_ms,
            "last_status_code": self.last_status_code,
            "last_error": self.last_error,
        }


@dataclass(frozen=True)
class NodeReady:
    node: str
    ts: float
    kind: Literal["NODE_READY"] = "NODE_READY"

    def to_dict(self) -> dict:
        return {"kind": self.kind, "ts": self.ts, "node": self.node}


@dataclass(frozen=True)
class NodeDown:
    node: str
    ts: float
    kind: Literal["NODE_DOWN"] = "NODE_DOWN"

    def to_dict(self) -> dict:
        return {"kind": self.kind, "ts": self.ts, "node": self.node}


@dataclass(frozen=True)
class PodCreated:
    namespace: str
    name: str
    node_name: str | None
    status: str
    ts: float
    kind: Literal["POD_CREATED"] = "POD_CREATED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "namespace": self.namespace,
            "name": self.name,
            "node_name": self.node_name,
            "status": self.status,
        }


@dataclass(frozen=True)
class PodMoved:
    namespace: str
    name: str
    from_node: str | None
    to_node: str | None
    ts: float
    kind: Literal["POD_MOVED"] = "POD_MOVED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "namespace": self.namespace,
            "name": self.name,
            "from_node": self.from_node,
            "to_node": self.to_node,
        }


@dataclass(frozen=True)
class PodCrashed:
    namespace: str
    name: str
    node_name: str | None
    reason: str
    ts: float
    kind: Literal["POD_CRASHED"] = "POD_CRASHED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "namespace": self.namespace,
            "name": self.name,
            "node_name": self.node_name,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class PodDeleted:
    namespace: str
    name: str
    node_name: str | None
    ts: float
    kind: Literal["POD_DELETED"] = "POD_DELETED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "namespace": self.namespace,
            "name": self.name,
            "node_name": self.node_name,
        }


@dataclass(frozen=True)
class PodStatusChanged:
    namespace: str
    name: str
    node_name: str | None
    from_status: str
    to_status: str
    ts: float
    kind: Literal["POD_STATUS"] = "POD_STATUS"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "namespace": self.namespace,
            "name": self.name,
            "node_name": self.node_name,
            "from_status": self.from_status,
            "to_status": self.to_status,
        }


@dataclass(frozen=True)
class VolumeAttached:
    volume: str
    node_name: str | None
    pvc_namespace: str | None
    pvc_name: str | None
    workload_namespace: str | None
    workload_name: str | None
    ts: float
    kind: Literal["VOLUME_ATTACHED"] = "VOLUME_ATTACHED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "volume": self.volume,
            "node_name": self.node_name,
            "pvc_namespace": self.pvc_namespace,
            "pvc_name": self.pvc_name,
            "workload_namespace": self.workload_namespace,
            "workload_name": self.workload_name,
        }


@dataclass(frozen=True)
class VolumeDetached:
    volume: str
    from_node: str | None
    pvc_namespace: str | None
    pvc_name: str | None
    workload_namespace: str | None
    workload_name: str | None
    ts: float
    kind: Literal["VOLUME_DETACHED"] = "VOLUME_DETACHED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "volume": self.volume,
            "from_node": self.from_node,
            "pvc_namespace": self.pvc_namespace,
            "pvc_name": self.pvc_name,
            "workload_namespace": self.workload_namespace,
            "workload_name": self.workload_name,
        }


@dataclass(frozen=True)
class VolumeReattached:
    volume: str
    from_node: str | None
    to_node: str | None
    pvc_namespace: str | None
    pvc_name: str | None
    workload_namespace: str | None
    workload_name: str | None
    ts: float
    kind: Literal["VOLUME_REATTACHED"] = "VOLUME_REATTACHED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "volume": self.volume,
            "from_node": self.from_node,
            "to_node": self.to_node,
            "pvc_namespace": self.pvc_namespace,
            "pvc_name": self.pvc_name,
            "workload_namespace": self.workload_namespace,
            "workload_name": self.workload_name,
        }


@dataclass(frozen=True)
class VolumeFaulted:
    volume: str
    node_name: str | None
    robustness: str
    ts: float
    kind: Literal["VOLUME_FAULTED"] = "VOLUME_FAULTED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "volume": self.volume,
            "node_name": self.node_name,
            "robustness": self.robustness,
        }


@dataclass(frozen=True)
class VolumeHealthChanged:
    volume: str
    node_name: str | None
    from_health: str
    to_health: str
    ts: float
    kind: Literal["VOLUME_HEALTH_CHANGED"] = "VOLUME_HEALTH_CHANGED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "volume": self.volume,
            "node_name": self.node_name,
            "from_health": self.from_health,
            "to_health": self.to_health,
        }


@dataclass(frozen=True)
class ReplicaHealthChanged:
    volume: str
    replica: str
    node_name: str | None
    from_health: str
    to_health: str
    ts: float
    kind: Literal["REPLICA_HEALTH_CHANGED"] = "REPLICA_HEALTH_CHANGED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "volume": self.volume,
            "replica": self.replica,
            "node_name": self.node_name,
            "from_health": self.from_health,
            "to_health": self.to_health,
        }


@dataclass(frozen=True)
class K8sWarning:
    involved_object_kind: str
    involved_object_namespace: str | None
    involved_object_name: str
    reason: str
    message: str
    ts: float
    kind: Literal["K8S_WARNING"] = "K8S_WARNING"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "involved_object_kind": self.involved_object_kind,
            "involved_object_namespace": self.involved_object_namespace,
            "involved_object_name": self.involved_object_name,
            "reason": self.reason,
            "message": self.message,
        }


@dataclass(frozen=True)
class ChaosStarted:
    experiment_kind: str
    name: str
    namespace: str
    ts: float
    kind: Literal["CHAOS_STARTED"] = "CHAOS_STARTED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "experiment_kind": self.experiment_kind,
            "name": self.name,
            "namespace": self.namespace,
        }


@dataclass(frozen=True)
class ChaosEnded:
    experiment_kind: str
    name: str
    namespace: str
    ts: float
    kind: Literal["CHAOS_ENDED"] = "CHAOS_ENDED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "experiment_kind": self.experiment_kind,
            "name": self.name,
            "namespace": self.namespace,
        }


@dataclass(frozen=True)
class ProbeOk:
    service: str
    url: str
    latency_ms: float
    status_code: int
    ts: float
    kind: Literal["PROBE_OK"] = "PROBE_OK"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "service": self.service,
            "url": self.url,
            "latency_ms": self.latency_ms,
            "status_code": self.status_code,
        }


@dataclass(frozen=True)
class ProbeDegraded:
    service: str
    url: str
    reason: str
    latency_ms: float | None
    status_code: int | None
    ts: float
    kind: Literal["PROBE_DEGRADED"] = "PROBE_DEGRADED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "service": self.service,
            "url": self.url,
            "reason": self.reason,
            "latency_ms": self.latency_ms,
            "status_code": self.status_code,
        }


@dataclass(frozen=True)
class ProbeFailed:
    service: str
    url: str
    error: str
    ts: float
    kind: Literal["PROBE_FAILED"] = "PROBE_FAILED"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "ts": self.ts,
            "service": self.service,
            "url": self.url,
            "error": self.error,
        }


ClusterEvent = (
    NodeReady
    | NodeDown
    | PodCreated
    | PodMoved
    | PodCrashed
    | PodDeleted
    | PodStatusChanged
    | VolumeAttached
    | VolumeDetached
    | VolumeReattached
    | VolumeFaulted
    | VolumeHealthChanged
    | ReplicaHealthChanged
    | K8sWarning
    | ChaosStarted
    | ChaosEnded
    | ProbeOk
    | ProbeDegraded
    | ProbeFailed
)
