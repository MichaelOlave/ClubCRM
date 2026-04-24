import unittest

from src.modules.cluster.domain.models import ChaosEnded, ChaosStarted
from src.modules.cluster.infrastructure.chaos_normalizer import parse_chaos_event


def _experiment(
    name: str,
    namespace: str = "chaos-testing",
    desired_phase: str = "Run",
) -> dict:
    return {
        "metadata": {
            "name": name,
            "namespace": namespace,
            "creationTimestamp": "2024-04-23T10:00:00Z",
        },
        "status": {
            "experiment": {
                "desiredPhase": desired_phase,
            }
        },
    }


class ParseChaosEventTests(unittest.TestCase):
    def test_added_returns_chaos_started(self) -> None:
        event = parse_chaos_event(_experiment("kill-api-pod"), "ADDED", "PodChaos")
        self.assertIsInstance(event, ChaosStarted)

    def test_deleted_returns_chaos_ended(self) -> None:
        event = parse_chaos_event(_experiment("kill-api-pod"), "DELETED", "PodChaos")
        self.assertIsInstance(event, ChaosEnded)

    def test_modified_with_run_phase_returns_started(self) -> None:
        raw = _experiment("kill-api-pod", desired_phase="Run")
        event = parse_chaos_event(raw, "MODIFIED", "PodChaos")
        self.assertIsInstance(event, ChaosStarted)

    def test_modified_with_stop_phase_returns_ended(self) -> None:
        raw = _experiment("kill-api-pod", desired_phase="Stop")
        event = parse_chaos_event(raw, "MODIFIED", "NetworkChaos")
        self.assertIsInstance(event, ChaosEnded)

    def test_modified_with_unknown_phase_returns_none(self) -> None:
        raw = _experiment("kill-api-pod", desired_phase="Injecting")
        event = parse_chaos_event(raw, "MODIFIED", "PodChaos")
        self.assertIsNone(event)

    def test_extracts_name_and_namespace(self) -> None:
        raw = _experiment("network-partition", namespace="chaos-mesh")
        event = parse_chaos_event(raw, "ADDED", "NetworkChaos")
        assert isinstance(event, ChaosStarted)
        self.assertEqual(event.name, "network-partition")
        self.assertEqual(event.namespace, "chaos-mesh")

    def test_extracts_experiment_kind(self) -> None:
        event = parse_chaos_event(_experiment("stress-cpu"), "ADDED", "StressChaos")
        assert isinstance(event, ChaosStarted)
        self.assertEqual(event.experiment_kind, "StressChaos")

    def test_chaos_started_to_dict_shape(self) -> None:
        event = parse_chaos_event(_experiment("kill-api-pod"), "ADDED", "PodChaos")
        assert event is not None
        d = event.to_dict()
        self.assertEqual(d["kind"], "CHAOS_STARTED")
        self.assertIn("name", d)
        self.assertIn("namespace", d)
        self.assertIn("experiment_kind", d)
        self.assertIn("ts", d)

    def test_chaos_ended_to_dict_shape(self) -> None:
        event = parse_chaos_event(_experiment("kill-api-pod"), "DELETED", "PodChaos")
        assert event is not None
        d = event.to_dict()
        self.assertEqual(d["kind"], "CHAOS_ENDED")

    def test_missing_name_returns_none(self) -> None:
        raw = {
            "metadata": {"name": "", "namespace": "chaos-testing"},
            "status": {},
        }
        event = parse_chaos_event(raw, "ADDED", "PodChaos")
        self.assertIsNone(event)

    def test_missing_namespace_returns_none(self) -> None:
        raw = {
            "metadata": {"name": "kill-api-pod", "namespace": ""},
            "status": {},
        }
        event = parse_chaos_event(raw, "ADDED", "PodChaos")
        self.assertIsNone(event)

    def test_timestamp_parsed_from_creation_timestamp(self) -> None:
        event = parse_chaos_event(_experiment("kill-api-pod"), "ADDED", "PodChaos")
        assert event is not None
        self.assertAlmostEqual(event.ts, 1713866400.0, delta=2.0)
