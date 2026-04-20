import unittest
from unittest.mock import patch

from src.config.settings import SshVmPowerSettings
from src.modules.monitoring.infrastructure.ssh_vm_power import SshVmPowerAdapter


class SshVmPowerAdapterTests(unittest.TestCase):
    @patch("src.modules.monitoring.infrastructure.ssh_vm_power.subprocess.run")
    def test_list_vms_parses_wrapper_json(self, mock_run) -> None:
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = (
            '[{"name":"Server1","status":"running"},{"name":"Server2","status":"stopped"}]'
        )
        mock_run.return_value.stderr = ""

        adapter = SshVmPowerAdapter(
            SshVmPowerSettings(
                ssh_host="ops.example.com",
                ssh_user="monitor",
                ssh_port=2222,
                ssh_identity_file="/tmp/id_monitor",
                remote_wrapper="/usr/local/bin/clubcrm-monitor-vm-power",
                poll_interval_seconds=5.0,
            )
        )

        states = adapter.list_vms()

        self.assertEqual(states["Server1"], "running")
        self.assertEqual(states["Server2"], "stopped")
        invoked_command = mock_run.call_args.args[0]
        self.assertEqual(invoked_command[:5], ["ssh", "-i", "/tmp/id_monitor", "-p", "2222"])

    @patch("src.modules.monitoring.infrastructure.ssh_vm_power.subprocess.run")
    def test_power_action_builds_expected_result(self, mock_run) -> None:
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = (
            '{"name":"Server1","status":"running","details":"restart requested"}'
        )
        mock_run.return_value.stderr = ""

        adapter = SshVmPowerAdapter(
            SshVmPowerSettings(
                ssh_host="ops.example.com",
                ssh_user="monitor",
                ssh_port=22,
                ssh_identity_file=None,
                remote_wrapper="/usr/local/bin/clubcrm-monitor-vm-power",
                poll_interval_seconds=5.0,
            )
        )

        result = adapter.power_action("Server1", "restart")

        self.assertEqual(result.vm_id, "Server1")
        self.assertEqual(result.power_state, "running")
        self.assertIn("restart requested", result.details)
