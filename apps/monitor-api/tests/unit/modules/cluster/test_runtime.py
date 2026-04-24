import asyncio
import json
import os
import tempfile
import unittest
from pathlib import Path

from src.config.settings import ClusterSettings
from src.modules.cluster.application.event_bus import EventBus
from src.modules.cluster.application.runtime import ClusterRuntime
from src.modules.cluster.application.state import ClusterState
from src.modules.cluster.application.websocket_hub import WebSocketHub


class FakeKubernetesAdapter:
    def __init__(self) -> None:
        self.node_stream_calls: list[str | None] = []
        self.pod_stream_calls: list[str | None] = []
        self.longhorn_volume_stream_calls: list[str | None] = []
        self.longhorn_replica_stream_calls: list[str | None] = []
        self._stream_events: dict[str, list[list[tuple[str, dict]]]] = {
            "node": [],
            "pod": [],
            "longhorn_volume": [],
            "longhorn_replica": [],
        }
        self._lists: dict[str, tuple[list[dict], str | None]] = {
            "node": ([], None),
            "pod": ([], None),
            "longhorn_volume": ([], None),
            "longhorn_replica": ([], None),
        }

    def list_nodes_with_resource_version(self) -> tuple[list[dict], str | None]:
        return self._lists["node"]

    def list_pods_with_resource_version(self) -> tuple[list[dict], str | None]:
        return self._lists["pod"]

    def queue_stream(self, resource: str, chunks: list[tuple[str, dict]]) -> None:
        self._stream_events[resource].append(chunks)

    def stream_nodes(self, *, resource_version: str | None = None):
        self.node_stream_calls.append(resource_version)
        return iter(self._stream_events["node"].pop(0))

    def stream_pods(self, *, resource_version: str | None = None):
        self.pod_stream_calls.append(resource_version)
        return iter(self._stream_events["pod"].pop(0))

    def list_longhorn_volumes_with_resource_version(self) -> tuple[list[dict], str | None]:
        return self._lists["longhorn_volume"]

    def list_longhorn_replicas_with_resource_version(self) -> tuple[list[dict], str | None]:
        return self._lists["longhorn_replica"]

    def stream_longhorn_volumes(self, *, resource_version: str | None = None):
        self.longhorn_volume_stream_calls.append(resource_version)
        return iter(self._stream_events["longhorn_volume"].pop(0))

    def stream_longhorn_replicas(self, *, resource_version: str | None = None):
        self.longhorn_replica_stream_calls.append(resource_version)
        return iter(self._stream_events["longhorn_replica"].pop(0))


class RecordingHub(WebSocketHub):
    def __init__(self) -> None:
        super().__init__()
        self.messages: list[dict] = []

    async def broadcast(self, payload: dict) -> None:
        self.messages.append(payload)


def _settings(*, snapshot_file: str | None = None) -> ClusterSettings:
    return ClusterSettings(
        kubeconfig_path=None,
        context=None,
        in_cluster=False,
        snapshot_file=snapshot_file,
        longhorn_enabled=True,
        k8s_events_enabled=False,
        chaos_enabled=False,
        heartbeat_seconds=60.0,
        watch_timeout_seconds=300,
    )


class ClusterRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_start_loads_snapshot_file_when_configured(self) -> None:
        payload = {
            "nodes": [{"name": "server1", "status": "Ready", "roles": ["control-plane"]}],
            "pods": [
                {
                    "namespace": "clubcrm",
                    "name": "api-1",
                    "status": "Running",
                    "node_name": "server1",
                    "uid": "clubcrm/api-1",
                }
            ],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            snapshot_path = Path(tmpdir) / "cluster.json"
            snapshot_path.write_text(json.dumps(payload), encoding="utf-8")
            runtime = ClusterRuntime(
                settings=_settings(snapshot_file=str(snapshot_path)),
                state=ClusterState(),
                event_bus=EventBus(),
                websocket_hub=RecordingHub(),
                kubernetes_adapter=FakeKubernetesAdapter(),
            )

            await runtime.start()
            snapshot = await runtime._state.snapshot()
            await runtime.stop()

        self.assertEqual(snapshot["nodes"][0]["name"], "server1")
        self.assertEqual(snapshot["pods"][0]["name"], "api-1")

    async def test_start_resolves_repo_relative_snapshot_file_from_app_cwd(self) -> None:
        runtime = ClusterRuntime(
            settings=_settings(snapshot_file="infra/monitoring/fixtures/k8s-snapshot.json"),
            state=ClusterState(),
            event_bus=EventBus(),
            websocket_hub=RecordingHub(),
            kubernetes_adapter=FakeKubernetesAdapter(),
        )
        original_cwd = Path.cwd()
        monitor_api_dir = Path(__file__).resolve().parents[4]

        try:
            os.chdir(monitor_api_dir)
            await runtime.start()
            snapshot = await runtime._state.snapshot()
        finally:
            await runtime.stop()
            os.chdir(original_cwd)

        self.assertEqual(snapshot["nodes"][0]["name"], "server1")
        self.assertGreater(len(snapshot["volumes"]), 0)

    async def test_apply_and_publish_updates_resource_version_and_broadcasts(self) -> None:
        state = ClusterState()
        event_bus = EventBus()
        hub = RecordingHub()
        runtime = ClusterRuntime(
            settings=_settings(),
            state=state,
            event_bus=event_bus,
            websocket_hub=hub,
            kubernetes_adapter=FakeKubernetesAdapter(),
        )

        async with event_bus.subscribe() as queue:
            raw = {
                "metadata": {
                    "namespace": "clubcrm",
                    "name": "api-1",
                    "uid": "clubcrm/api-1",
                    "resourceVersion": "101",
                },
                "spec": {"nodeName": "server2"},
                "status": {"phase": "Running"},
            }
            await runtime._apply_and_publish("pod", "ADDED", raw)
            published = await queue.get()

        self.assertEqual(runtime._resource_versions["pod"], "101")
        self.assertEqual(published["event"]["kind"], "POD_CREATED")

    async def test_prime_state_tracks_resource_version(self) -> None:
        adapter = FakeKubernetesAdapter()
        adapter._lists["node"] = (
            [
                {
                    "metadata": {"name": "server1"},
                    "status": {"conditions": [{"type": "Ready", "status": "True"}]},
                }
            ],
            "33",
        )
        runtime = ClusterRuntime(
            settings=_settings(),
            state=ClusterState(),
            event_bus=EventBus(),
            websocket_hub=RecordingHub(),
            kubernetes_adapter=adapter,
        )

        await runtime._prime_state("node")

        self.assertEqual(runtime._resource_versions["node"], "33")

    async def test_consume_stream_uses_last_resource_version(self) -> None:
        adapter = FakeKubernetesAdapter()
        adapter.queue_stream(
            "pod",
            [
                (
                    "MODIFIED",
                    {
                        "metadata": {
                            "namespace": "clubcrm",
                            "name": "api-1",
                            "uid": "clubcrm/api-1",
                            "resourceVersion": "91",
                        },
                        "spec": {"nodeName": "server3"},
                        "status": {"phase": "Running"},
                    },
                )
            ],
        )
        runtime = ClusterRuntime(
            settings=_settings(),
            state=ClusterState(),
            event_bus=EventBus(),
            websocket_hub=RecordingHub(),
            kubernetes_adapter=adapter,
        )
        runtime._resource_versions["pod"] = "90"

        loop = asyncio.get_running_loop()
        await runtime._state.apply_pod_event(
            "ADDED",
            {
                "metadata": {"namespace": "clubcrm", "name": "api-1", "uid": "clubcrm/api-1"},
                "spec": {"nodeName": "server2"},
                "status": {"phase": "Running"},
            },
        )
        await loop.run_in_executor(None, runtime._consume_stream, "pod", loop)

        self.assertEqual(adapter.pod_stream_calls, ["90"])
        self.assertEqual(runtime._resource_versions["pod"], "91")

    async def test_apply_and_publish_longhorn_volume_event(self) -> None:
        state = ClusterState()
        event_bus = EventBus()
        runtime = ClusterRuntime(
            settings=_settings(),
            state=state,
            event_bus=event_bus,
            websocket_hub=RecordingHub(),
            kubernetes_adapter=FakeKubernetesAdapter(),
        )

        raw = {
            "metadata": {"name": "pvc-postgres", "resourceVersion": "202"},
            "status": {
                "currentNodeID": "server2",
                "state": "attached",
                "robustness": "healthy",
                "kubernetesStatus": {
                    "namespace": "clubcrm-data",
                    "pvcName": "postgres-data",
                    "workloadName": "postgres-0",
                    "workloadType": "StatefulSet",
                },
            },
        }

        async with event_bus.subscribe() as queue:
            await runtime._apply_and_publish("longhorn_volume", "ADDED", raw)
            published = await queue.get()

        self.assertEqual(runtime._resource_versions["longhorn_volume"], "202")
        self.assertEqual(published["event"]["kind"], "VOLUME_ATTACHED")
