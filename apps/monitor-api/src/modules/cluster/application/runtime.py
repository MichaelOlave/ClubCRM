from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from pathlib import Path

from src.config.settings import ClusterSettings
from src.modules.cluster.application.event_bus import EventBus
from src.modules.cluster.application.state import ClusterState
from src.modules.cluster.application.websocket_hub import WebSocketHub
from src.modules.cluster.infrastructure.kubernetes_watch import KubernetesWatchAdapter

logger = logging.getLogger(__name__)


class ClusterRuntime:
    def __init__(
        self,
        *,
        settings: ClusterSettings,
        state: ClusterState,
        event_bus: EventBus,
        websocket_hub: WebSocketHub,
        kubernetes_adapter: KubernetesWatchAdapter,
    ) -> None:
        self._settings = settings
        self._state = state
        self._event_bus = event_bus
        self._websocket_hub = websocket_hub
        self._kubernetes_adapter = kubernetes_adapter
        self._tasks: list[asyncio.Task] = []
        self._stop_event = asyncio.Event()
        self._resource_versions: dict[str, str | None] = {
            "node": None,
            "pod": None,
            "longhorn_volume": None,
            "longhorn_replica": None,
        }

    async def start(self) -> None:
        if self._settings.snapshot_file:
            await self._load_snapshot_file()

        self._tasks = [
            asyncio.create_task(self._run_node_watch(), name="cluster-node-watch"),
            asyncio.create_task(self._run_pod_watch(), name="cluster-pod-watch"),
            asyncio.create_task(self._run_broadcast_loop(), name="cluster-broadcast"),
            asyncio.create_task(self._run_heartbeat_loop(), name="cluster-heartbeat"),
        ]
        if self._settings.longhorn_enabled:
            self._tasks.extend(
                [
                    asyncio.create_task(
                        self._run_longhorn_volume_watch(),
                        name="cluster-longhorn-volume-watch",
                    ),
                    asyncio.create_task(
                        self._run_longhorn_replica_watch(),
                        name="cluster-longhorn-replica-watch",
                    ),
                ]
            )

    async def stop(self) -> None:
        self._stop_event.set()
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def _load_snapshot_file(self) -> None:
        path = _resolve_snapshot_path(self._settings.snapshot_file or "")
        if not path.is_file():
            logger.warning("Cluster snapshot file not found: %s", path)
            return

        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            logger.exception("Failed to parse cluster snapshot file: %s", path)
            return

        nodes = payload.get("nodes") or []
        pods = payload.get("pods") or []
        volumes = payload.get("volumes") or []
        replicas = payload.get("replicas") or []
        if _is_serialized_snapshot(nodes, pods):
            await self._state.replace_serialized_nodes(nodes)
            await self._state.replace_serialized_pods(pods)
            await self._state.replace_serialized_volumes(volumes)
            await self._state.replace_serialized_replicas(replicas)
            return

        await self._state.replace_nodes(nodes)
        await self._state.replace_pods(pods)

    async def _run_node_watch(self) -> None:
        if self._settings.snapshot_file:
            return
        await self._run_watch_loop(resource="node")

    async def _run_pod_watch(self) -> None:
        if self._settings.snapshot_file:
            return
        await self._run_watch_loop(resource="pod")

    async def _run_longhorn_volume_watch(self) -> None:
        if self._settings.snapshot_file:
            return
        await self._run_watch_loop(resource="longhorn_volume")

    async def _run_longhorn_replica_watch(self) -> None:
        if self._settings.snapshot_file:
            return
        await self._run_watch_loop(resource="longhorn_replica")

    async def _run_watch_loop(self, *, resource: str) -> None:
        backoff_seconds = 1.0
        while not self._stop_event.is_set():
            try:
                await self._prime_state(resource)
                await asyncio.to_thread(self._consume_stream, resource, asyncio.get_running_loop())
                backoff_seconds = 1.0
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning(
                    "Cluster %s watch failed (%s); reconnecting in %.1fs",
                    resource,
                    exc,
                    backoff_seconds,
                )
                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(), timeout=backoff_seconds
                    )
                    return
                except TimeoutError:
                    backoff_seconds = min(backoff_seconds * 2, 30.0)

    async def _prime_state(self, resource: str) -> None:
        if resource == "node":
            items, resource_version = await asyncio.to_thread(
                self._kubernetes_adapter.list_nodes_with_resource_version
            )
            await self._state.replace_nodes(items)
        elif resource == "pod":
            items, resource_version = await asyncio.to_thread(
                self._kubernetes_adapter.list_pods_with_resource_version
            )
            await self._state.replace_pods(items)
        elif resource == "longhorn_volume":
            items, resource_version = await asyncio.to_thread(
                self._kubernetes_adapter.list_longhorn_volumes_with_resource_version
            )
            await self._state.replace_longhorn_volumes(items)
        else:
            items, resource_version = await asyncio.to_thread(
                self._kubernetes_adapter.list_longhorn_replicas_with_resource_version
            )
            await self._state.replace_longhorn_replicas(items)
        self._resource_versions[resource] = resource_version

    def _consume_stream(self, resource: str, loop: asyncio.AbstractEventLoop) -> None:
        if resource == "node":
            stream = self._kubernetes_adapter.stream_nodes(
                resource_version=self._resource_versions.get(resource)
            )
        elif resource == "pod":
            stream = self._kubernetes_adapter.stream_pods(
                resource_version=self._resource_versions.get(resource)
            )
        elif resource == "longhorn_volume":
            stream = self._kubernetes_adapter.stream_longhorn_volumes(
                resource_version=self._resource_versions.get(resource)
            )
        else:
            stream = self._kubernetes_adapter.stream_longhorn_replicas(
                resource_version=self._resource_versions.get(resource)
            )
        for event_type, raw in stream:
            if self._stop_event.is_set():
                return
            future = asyncio.run_coroutine_threadsafe(
                self._apply_and_publish(resource, event_type, raw), loop
            )
            future.result()

    async def _apply_and_publish(self, resource: str, event_type: str, raw: dict) -> None:
        metadata = raw.get("metadata") or {}
        resource_version = metadata.get("resourceVersion")
        if isinstance(resource_version, str) and resource_version:
            self._resource_versions[resource] = resource_version

        if resource == "node":
            events = await self._state.apply_node_event(event_type, raw)
        elif resource == "pod":
            events = await self._state.apply_pod_event(event_type, raw)
        elif resource == "longhorn_volume":
            events = await self._state.apply_longhorn_volume_event(event_type, raw)
        else:
            events = await self._state.apply_longhorn_replica_event(event_type, raw)

        for event in events:
            await self._event_bus.publish(
                {"type": "event", "ts": event.ts, "event": event.to_dict()}
            )

    async def _run_broadcast_loop(self) -> None:
        async with self._event_bus.subscribe() as queue:
            while not self._stop_event.is_set():
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=1.0)
                except TimeoutError:
                    continue
                await self._websocket_hub.broadcast(message)

    async def _run_heartbeat_loop(self) -> None:
        interval = max(self._settings.heartbeat_seconds, 1.0)
        while not self._stop_event.is_set():
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=interval)
                return
            except TimeoutError:
                snapshot = await self._state.snapshot()
                await self._websocket_hub.broadcast(snapshot)


def _is_serialized_snapshot(nodes: list[dict], pods: list[dict]) -> bool:
    if nodes:
        first_node = nodes[0]
        if isinstance(first_node, dict) and "name" in first_node and "status" in first_node:
            return True
    if pods:
        first_pod = pods[0]
        if isinstance(first_pod, dict) and "namespace" in first_pod and "name" in first_pod:
            return True
    return False


def _resolve_snapshot_path(snapshot_file: str) -> Path:
    path = Path(snapshot_file)
    if path.is_absolute():
        return path

    cwd_path = Path.cwd() / path
    if cwd_path.is_file():
        return cwd_path

    for parent in Path(__file__).resolve().parents:
        candidate = parent / path
        if candidate.is_file():
            return candidate

    return cwd_path
