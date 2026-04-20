import unittest
from unittest.mock import MagicMock, patch

from src.config.settings import ProxmoxSettings
from src.modules.monitoring.infrastructure.proxmox import ProxmoxVmPowerAdapter


class ProxmoxVmPowerAdapterTests(unittest.TestCase):
    @patch("src.modules.monitoring.infrastructure.proxmox.httpx.Client")
    def test_list_vms_parses_cluster_resources(self, mock_client_class) -> None:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": [
                {
                    "type": "qemu",
                    "vmid": 101,
                    "node": "pve-a",
                    "name": "Server1",
                    "status": "running",
                },
                {
                    "type": "qemu",
                    "vmid": 102,
                    "node": "pve-a",
                    "name": "Server2",
                    "status": "stopped",
                },
            ]
        }
        mock_client.get.return_value = mock_response
        mock_client_class.return_value.__enter__.return_value = mock_client

        adapter = ProxmoxVmPowerAdapter(
            ProxmoxSettings(
                base_url="https://proxmox.example.com:8006",
                token_id="root@pam!monitor",
                token_secret="secret",
                verify_tls=False,
                timeout_seconds=5.0,
                poll_interval_seconds=5.0,
            )
        )

        states = adapter.list_vms()

        self.assertEqual(states["Server1"], "running")
        self.assertEqual(states["Server2"], "stopped")
        mock_client.get.assert_called_once_with("/cluster/resources", params={"type": "vm"})

    @patch("src.modules.monitoring.infrastructure.proxmox.httpx.Client")
    def test_power_action_posts_to_proxmox_status_endpoint(self, mock_client_class) -> None:
        mock_client = MagicMock()
        list_response = MagicMock()
        list_response.json.return_value = {
            "data": [
                {
                    "type": "qemu",
                    "vmid": 101,
                    "node": "pve-a",
                    "name": "Server1",
                    "status": "running",
                }
            ]
        }
        action_response = MagicMock()
        action_response.json.return_value = {"data": "UPID:pve-a:00001234"}
        mock_client.get.return_value = list_response
        mock_client.post.return_value = action_response
        mock_client_class.return_value.__enter__.return_value = mock_client

        adapter = ProxmoxVmPowerAdapter(
            ProxmoxSettings(
                base_url="https://proxmox.example.com:8006",
                token_id="root@pam!monitor",
                token_secret="secret",
                verify_tls=False,
                timeout_seconds=5.0,
                poll_interval_seconds=5.0,
            )
        )

        result = adapter.power_action("Server1", "restart")

        self.assertEqual(result.vm_id, "Server1")
        self.assertEqual(result.power_state, "running")
        self.assertIn("reboot", result.details)
        mock_client.post.assert_called_once_with("/nodes/pve-a/qemu/101/status/reboot")
