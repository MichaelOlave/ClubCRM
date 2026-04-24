import asyncio
import unittest

from src.modules.cluster.application.state import ClusterState
from src.modules.cluster.domain.models import (
    NodeDown,
    NodeReady,
    PodCreated,
    PodDeleted,
    PodMoved,
    ProbeFailed,
    ProbeOk,
)
from src.modules.cluster.infrastructure.service_probe import ProbeResult, ProbeTarget


def _node(name: str, ready: bool) -> dict:
    return {
        "metadata": {"name": name, "labels": {}},
        "status": {
            "conditions": [{"type": "Ready", "status": "True" if ready else "False"}],
        },
    }


def _pod(namespace: str, name: str, node: str | None, phase: str = "Running") -> dict:
    return {
        "metadata": {"namespace": namespace, "name": name, "uid": f"{namespace}/{name}"},
        "spec": {"nodeName": node},
        "status": {"phase": phase},
    }


class ClusterStateTests(unittest.IsolatedAsyncioTestCase):
    async def test_initial_pod_added_emits_created(self) -> None:
        state = ClusterState()
        events = await state.apply_pod_event("ADDED", _pod("clubcrm", "api-1", "server2"))
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], PodCreated)

    async def test_pod_rescheduled_emits_moved(self) -> None:
        state = ClusterState()
        await state.apply_pod_event("ADDED", _pod("clubcrm", "api-1", "server2"))
        events = await state.apply_pod_event("MODIFIED", _pod("clubcrm", "api-1", "server3"))
        self.assertTrue(any(isinstance(e, PodMoved) for e in events))

    async def test_delete_pod_emits_deleted(self) -> None:
        state = ClusterState()
        await state.apply_pod_event("ADDED", _pod("clubcrm", "api-1", "server2"))
        events = await state.apply_pod_event("DELETED", _pod("clubcrm", "api-1", "server2"))
        self.assertTrue(any(isinstance(e, PodDeleted) for e in events))

    async def test_delete_unknown_pod_is_noop(self) -> None:
        state = ClusterState()
        events = await state.apply_pod_event("DELETED", _pod("clubcrm", "ghost", "server2"))
        self.assertEqual(events, [])

    async def test_node_ready_event(self) -> None:
        state = ClusterState()
        events = await state.apply_node_event("ADDED", _node("server1", True))
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], NodeReady)

    async def test_node_down_transition(self) -> None:
        state = ClusterState()
        await state.apply_node_event("ADDED", _node("server1", True))
        events = await state.apply_node_event("MODIFIED", _node("server1", False))
        self.assertTrue(any(isinstance(e, NodeDown) for e in events))

    async def test_snapshot_reflects_current_state(self) -> None:
        state = ClusterState()
        await state.apply_node_event("ADDED", _node("server1", True))
        await state.apply_pod_event("ADDED", _pod("clubcrm", "api-1", "server1"))
        snapshot = await state.snapshot()
        self.assertEqual(snapshot["type"], "snapshot")
        self.assertEqual([n["name"] for n in snapshot["nodes"]], ["server1"])
        self.assertEqual(snapshot["pods"][0]["name"], "api-1")
        self.assertEqual(snapshot["volumes"], [])
        self.assertEqual(snapshot["replicas"], [])
        self.assertEqual(snapshot["probes"], [])

    async def test_replace_nodes_and_pods(self) -> None:
        state = ClusterState()
        await state.apply_pod_event("ADDED", _pod("old", "stale", "server1"))
        await state.replace_nodes([_node("server1", True)])
        await state.replace_pods([_pod("new", "fresh", "server1")])
        snapshot = await state.snapshot()
        self.assertEqual([p["name"] for p in snapshot["pods"]], ["fresh"])

    async def test_replace_serialized_storage_state(self) -> None:
        state = ClusterState()
        await state.replace_serialized_volumes(
            [
                {
                    "name": "pvc-postgres",
                    "pvc_namespace": "clubcrm-data",
                    "pvc_name": "postgres-data",
                    "workload_namespace": "clubcrm-data",
                    "workload_name": "postgres-0",
                    "workload_kind": "StatefulSet",
                    "attachment_node": "server2",
                    "state": "attached",
                    "robustness": "healthy",
                    "health": "healthy",
                }
            ]
        )
        await state.replace_serialized_replicas(
            [
                {
                    "name": "pvc-postgres-r-1",
                    "volume_name": "pvc-postgres",
                    "node_name": "server2",
                    "mode": "RW",
                    "health": "healthy",
                }
            ]
        )

        snapshot = await state.snapshot()
        self.assertEqual(snapshot["volumes"][0]["name"], "pvc-postgres")
        self.assertEqual(snapshot["volumes"][0]["attachment_node"], "server2")
        self.assertEqual(snapshot["replicas"][0]["volume_name"], "pvc-postgres")

    async def test_probe_registration_and_transitions(self) -> None:
        state = ClusterState()
        await state.register_probe_targets(
            [ProbeTarget(service="clubcrm-web", url="https://clubcrm.local/login")]
        )
        first_event = await state.apply_probe_result(
            ProbeResult(
                service="clubcrm-web",
                url="https://clubcrm.local/login",
                status="ok",
                checked_at=1000.0,
                latency_ms=120.0,
                status_code=200,
                detail=None,
            )
        )
        second_event = await state.apply_probe_result(
            ProbeResult(
                service="clubcrm-web",
                url="https://clubcrm.local/login",
                status="ok",
                checked_at=1005.0,
                latency_ms=140.0,
                status_code=200,
                detail=None,
            )
        )
        third_event = await state.apply_probe_result(
            ProbeResult(
                service="clubcrm-web",
                url="https://clubcrm.local/login",
                status="failed",
                checked_at=1010.0,
                latency_ms=None,
                status_code=None,
                detail="timed out",
            )
        )

        snapshot = await state.snapshot()
        self.assertIsInstance(first_event, ProbeOk)
        self.assertIsNone(second_event)
        self.assertIsInstance(third_event, ProbeFailed)
        self.assertEqual(snapshot["probes"][0]["status"], "failed")
        self.assertEqual(snapshot["probes"][0]["last_error"], "timed out")


if __name__ == "__main__":
    asyncio.run(unittest.main())
