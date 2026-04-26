import unittest

from src.modules.cluster.domain.models import ReplicaHealthChanged, VolumeAttached, VolumeReattached
from src.modules.cluster.infrastructure.longhorn_normalizer import (
    diff_replica,
    diff_volume,
    parse_replica,
    parse_volume,
)


def _volume(
    name: str,
    *,
    node: str | None,
    state: str = "attached",
    robustness: str = "healthy",
) -> dict:
    return {
        "metadata": {"name": name},
        "status": {
            "currentNodeID": node,
            "state": state,
            "robustness": robustness,
            "kubernetesStatus": {
                "namespace": "clubcrm-data",
                "pvcName": "postgres-data",
                "workloadName": "postgres-0",
                "workloadType": "StatefulSet",
            },
        },
    }


def _replica(name: str, *, health_mode: str, failed_at: str | None = None) -> dict:
    status: dict[str, str] = {"mode": health_mode}
    if failed_at is not None:
        status["failedAt"] = failed_at
    return {
        "metadata": {"name": name},
        "spec": {"volumeName": "pvc-postgres", "nodeID": "server2"},
        "status": status,
    }


class ParseLonghornTests(unittest.TestCase):
    def test_parse_volume_maps_attachment_and_workload(self) -> None:
        volume = parse_volume(_volume("pvc-postgres", node="server2"))
        self.assertEqual(volume.attachment_node, "server2")
        self.assertEqual(volume.pvc_name, "postgres-data")
        self.assertEqual(volume.workload_name, "postgres-0")
        self.assertEqual(volume.health, "healthy")

    def test_parse_replica_derives_health(self) -> None:
        replica = parse_replica(_replica("replica-a", health_mode="WO"))
        self.assertEqual(replica.health, "degraded")

    def test_parse_replica_uses_current_state_when_mode_absent(self) -> None:
        raw = {
            "metadata": {"name": "replica-running"},
            "spec": {"volumeName": "pvc-postgres", "nodeID": "server1"},
            "status": {
                "currentState": "running",
                "started": True,
                "healthyAt": "2026-04-18T15:29:43Z",
            },
        }
        replica = parse_replica(raw)
        self.assertEqual(replica.mode, "running")
        self.assertEqual(replica.health, "healthy")

    def test_parse_replica_stopped_is_unknown(self) -> None:
        raw = {
            "metadata": {"name": "replica-stopped"},
            "spec": {"volumeName": "pvc-test", "nodeID": "server3"},
            "status": {
                "currentState": "stopped",
                "started": False,
                "healthyAt": "2026-04-18T15:29:09Z",
            },
        }
        replica = parse_replica(raw)
        self.assertEqual(replica.mode, "stopped")
        self.assertEqual(replica.health, "unknown")


class DiffLonghornTests(unittest.TestCase):
    def test_first_attached_volume_emits_attached(self) -> None:
        events = diff_volume(None, parse_volume(_volume("pvc-postgres", node="server2")), 1.0)
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], VolumeAttached)

    def test_attachment_move_emits_reattached(self) -> None:
        previous = parse_volume(_volume("pvc-postgres", node="server2"))
        current = parse_volume(_volume("pvc-postgres", node="server3"))
        events = diff_volume(previous, current, 1.0)
        self.assertTrue(any(isinstance(event, VolumeReattached) for event in events))

    def test_replica_health_change_emits_event(self) -> None:
        previous = parse_replica(_replica("replica-a", health_mode="RW"))
        current = parse_replica(_replica("replica-a", health_mode="ERR", failed_at="now"))
        events = diff_replica(previous, current, 1.0)
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], ReplicaHealthChanged)
