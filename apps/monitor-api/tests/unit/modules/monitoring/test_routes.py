import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from src.bootstrap.app_factory import create_app


class MonitoringRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client_manager = TestClient(create_app())
        self.client = self.client_manager.__enter__()
        self.addCleanup(lambda: self.client_manager.__exit__(None, None, None))

    def test_snapshot_returns_expected_shape(self) -> None:
        response = self.client.get("/api/snapshot")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("service", payload)
        self.assertIn("vms", payload)
        self.assertIn("kubernetes", payload)
        self.assertIn("storage_classes", payload["kubernetes"])
        self.assertIn("pvcs", payload["kubernetes"])
        self.assertIn("longhorn_volumes", payload["kubernetes"])
        self.assertIn("events", payload)

    def test_heartbeat_requires_agent_token(self) -> None:
        response = self.client.post(
            "/api/agents/vm1/heartbeat",
            json={
                "cpu_percent": 12,
                "memory_percent": 55,
                "containers": [],
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_heartbeat_returns_pending_commands(self) -> None:
        control_response = self.client.post(
            "/api/control/containers/vm1/nginx",
            json={"action": "restart"},
            headers={"Authorization": "Bearer monitor-admin-token"},
        )
        self.assertEqual(control_response.status_code, 200)

        response = self.client.post(
            "/api/agents/vm1/heartbeat",
            json={
                "cpu_percent": 12,
                "memory_percent": 55,
                "containers": [{"name": "nginx", "status": "running"}],
            },
            headers={"Authorization": "Bearer monitor-agent-vm1"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["commands"]), 1)

    def test_vm_control_requires_admin_token(self) -> None:
        response = self.client.post("/api/control/vms/vm1/power", json={"action": "stop"})

        self.assertEqual(response.status_code, 401)

    def test_websocket_stream_returns_snapshot_frame(self) -> None:
        with self.client.websocket_connect("/ws/stream") as websocket:
            payload = websocket.receive_json()

        self.assertIn("service", payload)
        self.assertIn("vms", payload)
        self.assertIn("generated_at", payload)

    @patch("src.modules.monitoring.infrastructure.orbstack.OrbStackSSHAdapter.power_action")
    def test_vm_control_returns_adapter_result(self, mock_power_action) -> None:
        mock_power_action.return_value.vm_id = "vm1"
        mock_power_action.return_value.power_state = "stopped"
        mock_power_action.return_value.details = "stopped"

        response = self.client.post(
            "/api/control/vms/vm1/power",
            json={"action": "stop"},
            headers={"Authorization": "Bearer monitor-admin-token"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["power_state"], "stopped")
