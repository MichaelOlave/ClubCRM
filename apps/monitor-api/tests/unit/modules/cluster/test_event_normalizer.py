import unittest

from src.modules.cluster.domain.models import (
    NodeDown,
    NodeReady,
    NodeState,
    PodCrashed,
    PodCreated,
    PodMoved,
    PodState,
    PodStatusChanged,
)
from src.modules.cluster.infrastructure.event_normalizer import (
    diff_node,
    diff_pod,
    parse_node,
    parse_pod,
    pod_terminated_reason,
)


def _node(name: str, ready: bool, roles: list[str] | None = None) -> dict:
    labels = {f"node-role.kubernetes.io/{role}": "" for role in roles or []}
    return {
        "metadata": {"name": name, "labels": labels},
        "status": {
            "conditions": [{"type": "Ready", "status": "True" if ready else "False"}],
        },
    }


def _pod(namespace: str, name: str, node: str | None, phase: str) -> dict:
    return {
        "metadata": {"namespace": namespace, "name": name, "uid": f"{namespace}/{name}"},
        "spec": {"nodeName": node},
        "status": {"phase": phase},
    }


class ParseNodeTests(unittest.TestCase):
    def test_parses_ready_node_with_roles(self) -> None:
        node = parse_node(_node("server1", True, ["control-plane", "master"]))
        self.assertEqual(node.name, "server1")
        self.assertEqual(node.status, "Ready")
        self.assertEqual(node.roles, ["control-plane", "master"])

    def test_marks_not_ready_when_condition_false(self) -> None:
        node = parse_node(_node("server2", False))
        self.assertEqual(node.status, "NotReady")


class ParsePodTests(unittest.TestCase):
    def test_parses_pod_with_node_assignment(self) -> None:
        pod = parse_pod(_pod("clubcrm", "api-1", "server2", "Running"))
        self.assertEqual(pod.namespace, "clubcrm")
        self.assertEqual(pod.name, "api-1")
        self.assertEqual(pod.status, "Running")
        self.assertEqual(pod.node_name, "server2")
        self.assertEqual(pod.uid, "clubcrm/api-1")


class DiffNodeTests(unittest.TestCase):
    def test_initial_ready_emits_node_ready(self) -> None:
        events = diff_node(None, NodeState(name="server1", status="Ready"), ts=1.0)
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], NodeReady)

    def test_initial_not_ready_emits_node_down(self) -> None:
        events = diff_node(None, NodeState(name="server1", status="NotReady"), ts=1.0)
        self.assertIsInstance(events[0], NodeDown)

    def test_no_change_emits_nothing(self) -> None:
        prev = NodeState(name="server1", status="Ready")
        events = diff_node(prev, NodeState(name="server1", status="Ready"), ts=1.0)
        self.assertEqual(events, [])

    def test_ready_to_notready_emits_node_down(self) -> None:
        prev = NodeState(name="server1", status="Ready")
        events = diff_node(prev, NodeState(name="server1", status="NotReady"), ts=1.0)
        self.assertIsInstance(events[0], NodeDown)


class DiffPodTests(unittest.TestCase):
    def test_first_sighting_emits_pod_created(self) -> None:
        raw = _pod("clubcrm", "api-1", "server2", "Running")
        events = diff_pod(None, parse_pod(raw), raw, ts=1.0)
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], PodCreated)

    def test_node_change_emits_pod_moved(self) -> None:
        prev = PodState(namespace="clubcrm", name="api-1", status="Running", node_name="server2")
        raw = _pod("clubcrm", "api-1", "server3", "Running")
        events = diff_pod(prev, parse_pod(raw), raw, ts=1.0)
        self.assertEqual(len(events), 1)
        self.assertIsInstance(events[0], PodMoved)
        assert isinstance(events[0], PodMoved)
        self.assertEqual(events[0].from_node, "server2")
        self.assertEqual(events[0].to_node, "server3")

    def test_status_change_emits_pod_status(self) -> None:
        prev = PodState(namespace="clubcrm", name="api-1", status="Pending", node_name="server2")
        raw = _pod("clubcrm", "api-1", "server2", "Running")
        events = diff_pod(prev, parse_pod(raw), raw, ts=1.0)
        kinds = [type(e).__name__ for e in events]
        self.assertIn("PodStatusChanged", kinds)

    def test_crash_reason_emits_pod_crashed(self) -> None:
        raw = _pod("clubcrm", "api-1", "server2", "Running")
        raw["status"]["containerStatuses"] = [
            {"lastState": {"terminated": {"reason": "OOMKilled"}}, "state": {}},
        ]
        prev = PodState(namespace="clubcrm", name="api-1", status="Running", node_name="server2")
        events = diff_pod(prev, parse_pod(raw), raw, ts=1.0)
        self.assertTrue(any(isinstance(e, PodCrashed) for e in events))

    def test_crash_loop_back_off_emits_pod_crashed(self) -> None:
        raw = _pod("clubcrm", "api-1", "server2", "Pending")
        raw["status"]["containerStatuses"] = [
            {"state": {"waiting": {"reason": "CrashLoopBackOff"}}, "lastState": {}},
        ]
        reason = pod_terminated_reason(raw)
        self.assertEqual(reason, "CrashLoopBackOff")


class PodStatusChangedShapeTests(unittest.TestCase):
    def test_to_dict_contains_transition(self) -> None:
        event = PodStatusChanged(
            namespace="clubcrm",
            name="api-1",
            node_name="server2",
            from_status="Pending",
            to_status="Running",
            ts=1.0,
        )
        payload = event.to_dict()
        self.assertEqual(payload["kind"], "POD_STATUS")
        self.assertEqual(payload["from_status"], "Pending")
        self.assertEqual(payload["to_status"], "Running")
