import unittest

from src.bootstrap.dependencies import build_vm_power_adapter
from src.config.settings import (
    ApiSettings,
    AuthSettings,
    ClubcrmSettings,
    KubernetesSettings,
    MonitoringSettings,
    OrbStackSettings,
    ProxmoxSettings,
    Settings,
    SshVmPowerSettings,
    SyntheticMonitorSettings,
)
from src.modules.monitoring.infrastructure.proxmox import ProxmoxVmPowerAdapter
from src.modules.monitoring.infrastructure.ssh_vm_power import SshVmPowerAdapter
from src.modules.monitoring.infrastructure.vm_power import OrbStackVmPowerAdapter


class BuildVmPowerAdapterTests(unittest.TestCase):
    def test_builds_orbstack_adapter_by_default(self) -> None:
        adapter = build_vm_power_adapter(build_settings(vm_provider="orbstack"))

        self.assertIsInstance(adapter, OrbStackVmPowerAdapter)

    def test_builds_proxmox_adapter_when_requested(self) -> None:
        adapter = build_vm_power_adapter(build_settings(vm_provider="proxmox"))

        self.assertIsInstance(adapter, ProxmoxVmPowerAdapter)

    def test_builds_ssh_adapter_when_requested(self) -> None:
        adapter = build_vm_power_adapter(build_settings(vm_provider="ssh"))

        self.assertIsInstance(adapter, SshVmPowerAdapter)


def build_settings(vm_provider: str) -> Settings:
    return Settings(
        api=ApiSettings(
            title="Monitor API",
            host="0.0.0.0",
            port=8010,
            public_base_url="http://localhost:8010",
        ),
        auth=AuthSettings(admin_token="token", agent_tokens={}),
        synthetic=SyntheticMonitorSettings(
            target_url="http://localhost:8000/health",
            interval_seconds=2.0,
            timeout_seconds=2.0,
            history_limit=50,
            event_limit=50,
            stale_after_seconds=4.0,
            latency_spike_threshold_ms=500.0,
        ),
        orbstack=OrbStackSettings(
            ssh_host=None,
            ssh_user=None,
            ssh_port=22,
            ssh_identity_file=None,
            remote_wrapper="/usr/local/bin/clubcrm-monitor-orbstack",
            poll_interval_seconds=5.0,
        ),
        proxmox=ProxmoxSettings(
            base_url="https://proxmox.example.com:8006",
            token_id="root@pam!monitor",
            token_secret="secret",
            verify_tls=False,
            timeout_seconds=5.0,
            poll_interval_seconds=5.0,
        ),
        ssh_vm_power=SshVmPowerSettings(
            ssh_host="ops.example.com",
            ssh_user="monitor",
            ssh_port=22,
            ssh_identity_file=None,
            remote_wrapper="/usr/local/bin/clubcrm-monitor-vm-power",
            poll_interval_seconds=5.0,
        ),
        kubernetes=KubernetesSettings(snapshot_file=None, poll_interval_seconds=5.0),
        monitoring=MonitoringSettings(target_vms=["Server1"], vm_provider=vm_provider),
        clubcrm=ClubcrmSettings(demo_url="http://clubcrm.local/demo/failover"),
    )
