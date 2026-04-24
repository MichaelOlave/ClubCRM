import unittest

from src.modules.cluster.domain.models import K8sWarning
from src.modules.cluster.infrastructure.k8s_event_normalizer import parse_k8s_warning


def _event(
    type_: str,
    reason: str = "BackOff",
    message: str = "Back-off restarting failed container",
    obj_kind: str = "Pod",
    obj_namespace: str = "clubcrm",
    obj_name: str = "api-0",
    last_timestamp: str | None = "2024-04-23T10:30:00Z",
) -> dict:
    raw: dict = {
        "type": type_,
        "reason": reason,
        "message": message,
        "involvedObject": {
            "kind": obj_kind,
            "namespace": obj_namespace,
            "name": obj_name,
        },
        "metadata": {"name": "api-0.abc", "resourceVersion": "12345"},
    }
    if last_timestamp is not None:
        raw["lastTimestamp"] = last_timestamp
    return raw


class ParseK8sWarningTests(unittest.TestCase):
    def test_warning_type_returns_k8s_warning(self) -> None:
        event = parse_k8s_warning(_event("Warning"))
        self.assertIsInstance(event, K8sWarning)

    def test_normal_type_returns_none(self) -> None:
        event = parse_k8s_warning(_event("Normal"))
        self.assertIsNone(event)

    def test_unknown_type_returns_none(self) -> None:
        event = parse_k8s_warning(_event(""))
        self.assertIsNone(event)

    def test_extracts_reason(self) -> None:
        event = parse_k8s_warning(_event("Warning", reason="OOMKilling"))
        assert event is not None
        self.assertEqual(event.reason, "OOMKilling")

    def test_extracts_message(self) -> None:
        event = parse_k8s_warning(_event("Warning", message="Container was OOM killed"))
        assert event is not None
        self.assertEqual(event.message, "Container was OOM killed")

    def test_pod_involved_object(self) -> None:
        raw = _event("Warning", obj_kind="Pod", obj_namespace="clubcrm", obj_name="api-0")
        event = parse_k8s_warning(raw)
        assert event is not None
        self.assertEqual(event.involved_object_kind, "Pod")
        self.assertEqual(event.involved_object_namespace, "clubcrm")
        self.assertEqual(event.involved_object_name, "api-0")

    def test_node_involved_object_has_no_namespace(self) -> None:
        raw = _event("Warning", obj_kind="Node", obj_namespace="", obj_name="server1")
        event = parse_k8s_warning(raw)
        assert event is not None
        self.assertEqual(event.involved_object_kind, "Node")
        self.assertIsNone(event.involved_object_namespace)
        self.assertEqual(event.involved_object_name, "server1")

    def test_parses_last_timestamp(self) -> None:
        event = parse_k8s_warning(_event("Warning", last_timestamp="2024-04-23T10:30:00Z"))
        assert event is not None
        self.assertAlmostEqual(event.ts, 1713868200.0, delta=2.0)

    def test_missing_timestamp_returns_float(self) -> None:
        event = parse_k8s_warning(_event("Warning", last_timestamp=None))
        assert event is not None
        self.assertIsInstance(event.ts, float)

    def test_to_dict_has_required_fields(self) -> None:
        event = parse_k8s_warning(_event("Warning", reason="BackOff"))
        assert event is not None
        d = event.to_dict()
        self.assertEqual(d["kind"], "K8S_WARNING")
        self.assertIn("reason", d)
        self.assertIn("message", d)
        self.assertIn("involved_object_kind", d)
        self.assertIn("involved_object_namespace", d)
        self.assertIn("involved_object_name", d)
        self.assertIn("ts", d)

    def test_whitespace_stripped_from_message(self) -> None:
        event = parse_k8s_warning(_event("Warning", message="  msg  "))
        assert event is not None
        self.assertEqual(event.message, "msg")
