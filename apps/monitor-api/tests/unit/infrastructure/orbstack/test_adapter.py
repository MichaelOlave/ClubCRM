import unittest
from unittest.mock import patch

from src.config.settings import OrbStackSettings
from src.modules.monitoring.infrastructure.orbstack import OrbStackSSHAdapter


class OrbStackSSHAdapterTests(unittest.TestCase):
    @patch("src.modules.monitoring.infrastructure.orbstack.subprocess.run")
    def test_list_vms_parses_wrapper_json(self, mock_run) -> None:
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = (
            '[{"name":"vm1","status":"running"},{"name":"vm2","status":"stopped"}]'
        )
        mock_run.return_value.stderr = ""

        adapter = OrbStackSSHAdapter(
            OrbStackSettings(
                ssh_host="mac-host.local",
                ssh_user="monitor",
                ssh_port=22,
                ssh_identity_file=None,
                remote_wrapper="/usr/local/bin/clubcrm-monitor-orbstack",
                poll_interval_seconds=5.0,
            )
        )

        states = adapter.list_vms()

        self.assertEqual(states["vm1"], "running")
        self.assertEqual(states["vm2"], "stopped")

    @patch("src.modules.monitoring.infrastructure.orbstack.subprocess.run")
    def test_power_action_builds_expected_result(self, mock_run) -> None:
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = (
            '{"name":"vm1","status":"stopped","details":"stop requested"}'
        )
        mock_run.return_value.stderr = ""

        adapter = OrbStackSSHAdapter(
            OrbStackSettings(
                ssh_host="mac-host.local",
                ssh_user="monitor",
                ssh_port=2222,
                ssh_identity_file="/tmp/id_monitor",
                remote_wrapper="/usr/local/bin/clubcrm-monitor-orbstack",
                poll_interval_seconds=5.0,
            )
        )

        result = adapter.power_action("vm1", "stop")

        self.assertEqual(result.vm_id, "vm1")
        self.assertEqual(result.power_state, "stopped")
        self.assertIn("stop requested", result.details)
        invoked_command = mock_run.call_args.args[0]
        self.assertEqual(invoked_command[:5], ["ssh", "-i", "/tmp/id_monitor", "-p", "2222"])

    @patch("src.modules.monitoring.infrastructure.orbstack.shutil.which")
    @patch("src.modules.monitoring.infrastructure.orbstack.subprocess.run")
    def test_list_vms_uses_local_cli_when_available(self, mock_run, mock_which) -> None:
        mock_which.return_value = "/opt/homebrew/bin/orbctl"
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = (
            '[{"name":"Server1","state":"running"},{"name":"Server2","state":"stopped"}]'
        )
        mock_run.return_value.stderr = ""

        adapter = OrbStackSSHAdapter(
            OrbStackSettings(
                ssh_host=None,
                ssh_user=None,
                ssh_port=22,
                ssh_identity_file=None,
                remote_wrapper="/usr/local/bin/clubcrm-monitor-orbstack",
                poll_interval_seconds=5.0,
            )
        )

        states = adapter.list_vms()

        self.assertEqual(states["Server1"], "running")
        self.assertEqual(states["Server2"], "stopped")
        invoked_command = mock_run.call_args.args[0]
        self.assertEqual(
            invoked_command,
            ["/opt/homebrew/bin/orbctl", "list", "--format", "json"],
        )

    @patch("src.modules.monitoring.infrastructure.orbstack.shutil.which")
    @patch("src.modules.monitoring.infrastructure.orbstack.subprocess.run")
    def test_power_action_uses_local_cli_when_available(self, mock_run, mock_which) -> None:
        mock_which.return_value = "/opt/homebrew/bin/orbctl"
        mock_run.side_effect = [
            unittest.mock.Mock(returncode=0, stdout="Server1 stopped\n", stderr=""),
            unittest.mock.Mock(
                returncode=0,
                stdout='{"record":{"name":"Server1","state":"stopped"}}',
                stderr="",
            ),
        ]

        adapter = OrbStackSSHAdapter(
            OrbStackSettings(
                ssh_host=None,
                ssh_user=None,
                ssh_port=22,
                ssh_identity_file=None,
                remote_wrapper="/usr/local/bin/clubcrm-monitor-orbstack",
                poll_interval_seconds=5.0,
            )
        )

        result = adapter.power_action("Server1", "stop")

        self.assertEqual(result.vm_id, "Server1")
        self.assertEqual(result.power_state, "stopped")
        self.assertIn("Server1 stopped", result.details)
        first_command = mock_run.call_args_list[0].args[0]
        second_command = mock_run.call_args_list[1].args[0]
        self.assertEqual(first_command, ["/opt/homebrew/bin/orbctl", "stop", "Server1"])
        self.assertEqual(
            second_command,
            ["/opt/homebrew/bin/orbctl", "info", "Server1", "--format", "json"],
        )
