from __future__ import annotations

import asyncio
import time

from src.modules.cluster.domain.models import (
    ClusterEvent,
    NodeState,
    PodState,
    VolumeReplicaState,
    VolumeState,
)
from src.modules.cluster.infrastructure.event_normalizer import (
    diff_node,
    diff_pod,
    parse_node,
    parse_pod,
    pod_deletion_event,
)
from src.modules.cluster.infrastructure.longhorn_normalizer import (
    diff_replica,
    diff_volume,
    parse_replica,
    parse_volume,
)


class ClusterState:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._nodes: dict[str, NodeState] = {}
        self._pods: dict[tuple[str, str], PodState] = {}
        self._volumes: dict[str, VolumeState] = {}
        self._replicas: dict[str, VolumeReplicaState] = {}
        self._last_updated_at: float = 0.0

    async def apply_node_event(self, event_type: str, raw: dict) -> list[ClusterEvent]:
        node = parse_node(raw)
        if not node.name:
            return []
        ts = time.time()
        async with self._lock:
            self._last_updated_at = ts
            if event_type == "DELETED":
                previous = self._nodes.pop(node.name, None)
                if previous is None:
                    return []
                from src.modules.cluster.domain.models import NodeDown

                return [NodeDown(node=node.name, ts=ts)]

            previous = self._nodes.get(node.name)
            self._nodes[node.name] = node
            return diff_node(previous, node, ts)

    async def apply_pod_event(self, event_type: str, raw: dict) -> list[ClusterEvent]:
        pod = parse_pod(raw)
        if not pod.name or not pod.namespace:
            return []
        ts = time.time()
        key = (pod.namespace, pod.name)
        async with self._lock:
            self._last_updated_at = ts
            if event_type == "DELETED":
                previous = self._pods.pop(key, None)
                if previous is None:
                    return []
                return [pod_deletion_event(previous, ts)]

            previous = self._pods.get(key)
            self._pods[key] = pod
            return diff_pod(previous, pod, raw, ts)

    async def replace_nodes(self, raws: list[dict]) -> None:
        async with self._lock:
            self._nodes = {}
            for raw in raws:
                node = parse_node(raw)
                if node.name:
                    self._nodes[node.name] = node
            self._last_updated_at = time.time()

    async def replace_serialized_nodes(self, nodes: list[dict]) -> None:
        async with self._lock:
            self._nodes = {}
            for raw in nodes:
                name = raw.get("name")
                status = raw.get("status")
                if not isinstance(name, str) or not isinstance(status, str):
                    continue
                roles = raw.get("roles") or []
                self._nodes[name] = NodeState(
                    name=name,
                    status=status,
                    roles=[role for role in roles if isinstance(role, str)],
                )
            self._last_updated_at = time.time()

    async def replace_pods(self, raws: list[dict]) -> None:
        async with self._lock:
            self._pods = {}
            for raw in raws:
                pod = parse_pod(raw)
                if pod.name and pod.namespace:
                    self._pods[(pod.namespace, pod.name)] = pod
            self._last_updated_at = time.time()

    async def replace_serialized_volumes(self, volumes: list[dict]) -> None:
        async with self._lock:
            self._volumes = {}
            for raw in volumes:
                name = raw.get("name")
                if not isinstance(name, str) or not name:
                    continue
                self._volumes[name] = VolumeState(
                    name=name,
                    pvc_namespace=_read_optional_string(raw, "pvc_namespace"),
                    pvc_name=_read_optional_string(raw, "pvc_name"),
                    workload_namespace=_read_optional_string(raw, "workload_namespace"),
                    workload_name=_read_optional_string(raw, "workload_name"),
                    workload_kind=_read_optional_string(raw, "workload_kind"),
                    attachment_node=_read_optional_string(raw, "attachment_node"),
                    state=_read_string(raw, "state", "unknown"),
                    robustness=_read_string(raw, "robustness", "unknown"),
                    health=_read_string(raw, "health", "unknown"),
                )
            self._last_updated_at = time.time()

    async def apply_longhorn_volume_event(self, event_type: str, raw: dict) -> list[ClusterEvent]:
        volume = parse_volume(raw)
        if not volume.name:
            return []
        ts = time.time()
        async with self._lock:
            self._last_updated_at = ts
            previous = self._volumes.get(volume.name)
            if event_type == "DELETED":
                if previous is not None:
                    self._volumes.pop(volume.name, None)
                return []

            self._volumes[volume.name] = volume
            return diff_volume(previous, volume, ts)

    async def apply_longhorn_replica_event(self, event_type: str, raw: dict) -> list[ClusterEvent]:
        replica = parse_replica(raw)
        if not replica.name or not replica.volume_name:
            return []
        ts = time.time()
        async with self._lock:
            self._last_updated_at = ts
            previous = self._replicas.get(replica.name)
            if event_type == "DELETED":
                if previous is not None:
                    self._replicas.pop(replica.name, None)
                return []

            self._replicas[replica.name] = replica
            return diff_replica(previous, replica, ts)

    async def replace_serialized_replicas(self, replicas: list[dict]) -> None:
        async with self._lock:
            self._replicas = {}
            for raw in replicas:
                name = raw.get("name")
                volume_name = raw.get("volume_name")
                if (
                    not isinstance(name, str)
                    or not name
                    or not isinstance(volume_name, str)
                    or not volume_name
                ):
                    continue
                self._replicas[name] = VolumeReplicaState(
                    name=name,
                    volume_name=volume_name,
                    node_name=_read_optional_string(raw, "node_name"),
                    mode=_read_string(raw, "mode", "unknown"),
                    health=_read_string(raw, "health", "unknown"),
                )
            self._last_updated_at = time.time()

    async def replace_longhorn_volumes(self, raws: list[dict]) -> None:
        async with self._lock:
            self._volumes = {}
            for raw in raws:
                volume = parse_volume(raw)
                if volume.name:
                    self._volumes[volume.name] = volume
            self._last_updated_at = time.time()

    async def replace_longhorn_replicas(self, raws: list[dict]) -> None:
        async with self._lock:
            self._replicas = {}
            for raw in raws:
                replica = parse_replica(raw)
                if replica.name and replica.volume_name:
                    self._replicas[replica.name] = replica
            self._last_updated_at = time.time()

    async def replace_serialized_pods(self, pods: list[dict]) -> None:
        async with self._lock:
            self._pods = {}
            for raw in pods:
                namespace = raw.get("namespace")
                name = raw.get("name")
                status = raw.get("status")
                if not isinstance(namespace, str) or not isinstance(name, str):
                    continue
                self._pods[(namespace, name)] = PodState(
                    namespace=namespace,
                    name=name,
                    status=status if isinstance(status, str) else "Unknown",
                    node_name=raw.get("node_name")
                    if isinstance(raw.get("node_name"), str) or raw.get("node_name") is None
                    else None,
                    uid=raw.get("uid") if isinstance(raw.get("uid"), str) else None,
                )
            self._last_updated_at = time.time()

    async def snapshot(self) -> dict:
        async with self._lock:
            return {
                "type": "snapshot",
                "ts": self._last_updated_at or time.time(),
                "nodes": [node.to_dict() for node in self._nodes.values()],
                "pods": [pod.to_dict() for pod in self._pods.values()],
                "volumes": [volume.to_dict() for volume in self._volumes.values()],
                "replicas": [replica.to_dict() for replica in self._replicas.values()],
            }


def _read_optional_string(raw: dict, key: str) -> str | None:
    value = raw.get(key)
    return value if isinstance(value, str) else None


def _read_string(raw: dict, key: str, default: str) -> str:
    value = raw.get(key)
    return value if isinstance(value, str) and value else default
