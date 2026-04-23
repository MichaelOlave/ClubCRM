import asyncio
import unittest

from src.modules.monitoring.application.state import MonitoringState
from src.modules.monitoring.domain.models import (
    AgentCommandResult,
    ContainerSnapshot,
    KubernetesNodeSnapshot,
    KubernetesPersistentVolumeClaimSnapshot,
    KubernetesPodSnapshot,
    KubernetesStorageClassSnapshot,
    LonghornVolumeSnapshot,
)


class MonitoringStateTests(unittest.IsolatedAsyncioTestCase):
    async def test_records_synthetic_transitions_and_rolls_history(self) -> None:
        state = MonitoringState(
            target_vms=["vm1"],
            history_limit=2,
            event_limit=10,
            stale_after_seconds=5,
            latency_spike_threshold_ms=500,
            synthetic_target_url="http://localhost:8000/health",
        )

        await state.record_synthetic_check(available=True, latency_ms=120, status_code=200)
        await state.record_synthetic_check(
            available=False,
            latency_ms=None,
            status_code=None,
            error="boom",
        )
        await state.record_synthetic_check(available=True, latency_ms=650, status_code=200)

        snapshot = await state.snapshot()

        self.assertEqual(len(snapshot["service"]["history"]), 2)
        self.assertEqual(snapshot["service"]["status"], "up")
        event_kinds = [event["kind"] for event in snapshot["events"]]
        self.assertIn("service-availability", event_kinds)
        self.assertIn("latency-spike", event_kinds)
        self.assertIn("demo", snapshot)

    async def test_marks_agent_stale_after_missed_heartbeat(self) -> None:
        state = MonitoringState(
            target_vms=["vm1"],
            history_limit=5,
            event_limit=10,
            stale_after_seconds=0.001,
            latency_spike_threshold_ms=500,
            synthetic_target_url="http://localhost:8000/health",
        )

        await state.record_heartbeat(
            vm_id="vm1",
            cpu_percent=10,
            memory_percent=20,
            monotonic_time=1.0,
            containers=[],
            command_results=[],
        )
        await asyncio.sleep(0.01)

        snapshot = await state.snapshot()

        self.assertEqual(snapshot["vms"][0]["agent_status"], "stale")

    async def test_queues_and_delivers_pending_container_commands(self) -> None:
        state = MonitoringState(
            target_vms=["vm1"],
            history_limit=5,
            event_limit=10,
            stale_after_seconds=5,
            latency_spike_threshold_ms=500,
            synthetic_target_url="http://localhost:8000/health",
        )

        await state.queue_container_action("vm1", "nginx", "restart")
        commands = await state.record_heartbeat(
            vm_id="vm1",
            cpu_percent=11,
            memory_percent=12,
            monotonic_time=2.0,
            containers=[ContainerSnapshot(name="nginx", status="running", image="nginx:latest")],
            command_results=[
                AgentCommandResult(
                    command_id="cmd-123",
                    kind="container",
                    action="restart",
                    target="nginx",
                    success=True,
                    details="done",
                )
            ],
        )

        self.assertEqual(len(commands), 1)
        snapshot = await state.snapshot()
        self.assertEqual(snapshot["vms"][0]["pending_commands"], 0)
        event_messages = [event["message"] for event in snapshot["events"]]
        self.assertTrue(any("Restart queued" in message for message in event_messages))

    async def test_ignores_power_updates_for_untracked_vms(self) -> None:
        state = MonitoringState(
            target_vms=["vm1"],
            history_limit=5,
            event_limit=10,
            stale_after_seconds=5,
            latency_spike_threshold_ms=500,
            synthetic_target_url="http://localhost:8000/health",
        )

        await state.record_vm_power_states({"vm1": "running", "vm-extra": "running"})

        snapshot = await state.snapshot()

        self.assertEqual([vm["id"] for vm in snapshot["vms"]], ["vm1"])

    async def test_serializes_storage_details_in_kubernetes_snapshot(self) -> None:
        state = MonitoringState(
            target_vms=["vm1"],
            history_limit=5,
            event_limit=10,
            stale_after_seconds=5,
            latency_spike_threshold_ms=500,
            synthetic_target_url="http://localhost:8000/health",
        )

        await state.record_kubernetes_snapshot(
            connected=True,
            source="kubectl",
            nodes=[],
            pods=[],
            storage_classes=[
                KubernetesStorageClassSnapshot(
                    name="longhorn",
                    provisioner="driver.longhorn.io",
                    is_default=False,
                    volume_binding_mode="Immediate",
                    reclaim_policy="Delete",
                )
            ],
            persistent_volume_claims=[
                KubernetesPersistentVolumeClaimSnapshot(
                    namespace="clubcrm-data",
                    name="postgres-data",
                    status="Bound",
                    storage_class_name="longhorn",
                    requested_storage="20Gi",
                    volume_name="pvc-123",
                    volume_status="Bound",
                )
            ],
            longhorn_volumes=[
                LonghornVolumeSnapshot(
                    namespace="longhorn-system",
                    name="pvc-123",
                    state="attached",
                    robustness="healthy",
                    size="21474836480",
                    node_id="vm2",
                    ready=True,
                )
            ],
        )

        snapshot = await state.snapshot()

        self.assertEqual(snapshot["kubernetes"]["storage_classes"][0]["name"], "longhorn")
        self.assertEqual(snapshot["kubernetes"]["pvcs"][0]["status"], "Bound")
        self.assertTrue(snapshot["kubernetes"]["longhorn_volumes"][0]["ready"])

    async def test_serializes_demo_failover_summary(self) -> None:
        state = MonitoringState(
            target_vms=["Server1", "Server2"],
            history_limit=5,
            event_limit=10,
            stale_after_seconds=5,
            latency_spike_threshold_ms=500,
            synthetic_target_url="http://localhost:8000/health",
        )

        await state.record_vm_power_states({"Server1": "running", "Server2": "running"})
        await state.record_heartbeat(
            vm_id="Server1",
            cpu_percent=12,
            memory_percent=24,
            monotonic_time=1.0,
            containers=[],
            command_results=[],
        )
        await state.record_heartbeat(
            vm_id="Server2",
            cpu_percent=8,
            memory_percent=22,
            monotonic_time=2.0,
            containers=[],
            command_results=[],
        )
        await state.record_kubernetes_snapshot(
            connected=True,
            source="kubectl",
            nodes=[
                KubernetesNodeSnapshot(name="Server1", status="Ready"),
                KubernetesNodeSnapshot(name="Server2", status="Ready"),
            ],
            pods=[
                KubernetesPodSnapshot(
                    namespace="clubcrm",
                    name="clubcrm-web-abc123",
                    status="Running",
                    node_name="Server1",
                ),
                KubernetesPodSnapshot(
                    namespace="clubcrm",
                    name="clubcrm-web-def456",
                    status="Running",
                    node_name="Server2",
                ),
            ],
        )

        snapshot = await state.snapshot()

        self.assertEqual(snapshot["demo"]["failover_target"]["vm_id"], "Server1")
        self.assertEqual(snapshot["demo"]["healthy_vm_count"], 2)
        self.assertEqual(snapshot["demo"]["standby_node_names"], ["Server2"])
