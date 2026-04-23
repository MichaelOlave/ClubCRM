import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class ApiSettings:
    title: str
    host: str
    port: int
    public_base_url: str


@dataclass(frozen=True)
class AuthSettings:
    admin_token: str
    agent_tokens: dict[str, str]


@dataclass(frozen=True)
class SyntheticMonitorSettings:
    target_url: str
    interval_seconds: float
    timeout_seconds: float
    history_limit: int
    event_limit: int
    stale_after_seconds: float
    latency_spike_threshold_ms: float


@dataclass(frozen=True)
class OrbStackSettings:
    ssh_host: str | None
    ssh_user: str | None
    ssh_port: int
    ssh_identity_file: str | None
    remote_wrapper: str
    poll_interval_seconds: float


@dataclass(frozen=True)
class ProxmoxSettings:
    base_url: str | None
    token_id: str | None
    token_secret: str | None
    verify_tls: bool
    timeout_seconds: float
    poll_interval_seconds: float


@dataclass(frozen=True)
class SshVmPowerSettings:
    ssh_host: str | None
    ssh_user: str | None
    ssh_port: int
    ssh_identity_file: str | None
    remote_wrapper: str | None
    poll_interval_seconds: float


@dataclass(frozen=True)
class KubernetesSettings:
    snapshot_file: str | None
    poll_interval_seconds: float


@dataclass(frozen=True)
class MonitoringSettings:
    target_vms: list[str]
    vm_provider: str


@dataclass(frozen=True)
class ClubcrmSettings:
    demo_url: str


@dataclass(frozen=True)
class Settings:
    api: ApiSettings
    auth: AuthSettings
    synthetic: SyntheticMonitorSettings
    orbstack: OrbStackSettings
    proxmox: ProxmoxSettings
    ssh_vm_power: SshVmPowerSettings
    kubernetes: KubernetesSettings
    monitoring: MonitoringSettings
    clubcrm: ClubcrmSettings


def _read_optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None

    stripped_value = value.strip()
    return stripped_value or None


def _read_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default

    return float(value)


def _read_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def _read_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    return int(value)


def _read_csv_env(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if value is None:
        return default

    return [item.strip() for item in value.split(",") if item.strip()]


def _read_agent_tokens() -> dict[str, str]:
    tokens = os.getenv(
        "MONITOR_AGENT_TOKENS",
        "vm1:monitor-agent-vm1,vm2:monitor-agent-vm2,vm3:monitor-agent-vm3",
    )
    parsed: dict[str, str] = {}

    for raw_entry in tokens.split(","):
        entry = raw_entry.strip()
        if not entry or ":" not in entry:
            continue

        vm_id, token = entry.split(":", 1)
        vm_key = vm_id.strip()
        token_value = token.strip()
        if vm_key and token_value:
            parsed[vm_key] = token_value

    return parsed


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api=ApiSettings(
            title=os.getenv("MONITOR_API_TITLE", "ClubCRM Monitoring API"),
            host=os.getenv("MONITOR_API_HOST", "0.0.0.0"),
            port=_read_int_env("MONITOR_API_PORT", 8010),
            public_base_url=os.getenv("MONITOR_API_BASE_URL", "http://localhost:8010"),
        ),
        auth=AuthSettings(
            admin_token=os.getenv("MONITOR_ADMIN_TOKEN", "monitor-admin-token"),
            agent_tokens=_read_agent_tokens(),
        ),
        synthetic=SyntheticMonitorSettings(
            target_url=os.getenv("MONITOR_SYNTHETIC_TARGET_URL", "http://localhost:8000/health"),
            interval_seconds=_read_float_env("MONITOR_SYNTHETIC_INTERVAL_SECONDS", 2.0),
            timeout_seconds=_read_float_env("MONITOR_SYNTHETIC_TIMEOUT_SECONDS", 2.0),
            history_limit=_read_int_env("MONITOR_HISTORY_LIMIT", 300),
            event_limit=_read_int_env("MONITOR_EVENT_LIMIT", 120),
            stale_after_seconds=_read_float_env("MONITOR_STALE_AFTER_SECONDS", 4.0),
            latency_spike_threshold_ms=_read_float_env("MONITOR_LATENCY_SPIKE_MS", 500.0),
        ),
        orbstack=OrbStackSettings(
            ssh_host=_read_optional_env("MONITOR_ORBSTACK_SSH_HOST"),
            ssh_user=_read_optional_env("MONITOR_ORBSTACK_SSH_USER"),
            ssh_port=_read_int_env("MONITOR_ORBSTACK_SSH_PORT", 22),
            ssh_identity_file=_read_optional_env("MONITOR_ORBSTACK_SSH_IDENTITY_FILE"),
            remote_wrapper=os.getenv(
                "MONITOR_ORBSTACK_REMOTE_WRAPPER",
                "/usr/local/bin/clubcrm-monitor-orbstack",
            ),
            poll_interval_seconds=_read_float_env("MONITOR_ORBSTACK_POLL_INTERVAL_SECONDS", 5.0),
        ),
        proxmox=ProxmoxSettings(
            base_url=_read_optional_env("MONITOR_PROXMOX_BASE_URL"),
            token_id=_read_optional_env("MONITOR_PROXMOX_TOKEN_ID"),
            token_secret=_read_optional_env("MONITOR_PROXMOX_TOKEN_SECRET"),
            verify_tls=_read_bool_env("MONITOR_PROXMOX_VERIFY_TLS", True),
            timeout_seconds=_read_float_env("MONITOR_PROXMOX_TIMEOUT_SECONDS", 5.0),
            poll_interval_seconds=_read_float_env("MONITOR_PROXMOX_POLL_INTERVAL_SECONDS", 5.0),
        ),
        ssh_vm_power=SshVmPowerSettings(
            ssh_host=_read_optional_env("MONITOR_SSH_VM_POWER_HOST"),
            ssh_user=_read_optional_env("MONITOR_SSH_VM_POWER_USER"),
            ssh_port=_read_int_env("MONITOR_SSH_VM_POWER_PORT", 22),
            ssh_identity_file=_read_optional_env("MONITOR_SSH_VM_POWER_IDENTITY_FILE"),
            remote_wrapper=_read_optional_env("MONITOR_SSH_VM_POWER_REMOTE_WRAPPER"),
            poll_interval_seconds=_read_float_env(
                "MONITOR_SSH_VM_POWER_POLL_INTERVAL_SECONDS", 5.0
            ),
        ),
        kubernetes=KubernetesSettings(
            snapshot_file=_read_optional_env("MONITOR_K8S_SNAPSHOT_FILE"),
            poll_interval_seconds=_read_float_env("MONITOR_K8S_POLL_INTERVAL_SECONDS", 5.0),
        ),
        monitoring=MonitoringSettings(
            target_vms=_read_csv_env("MONITOR_TARGET_VMS", ["vm1", "vm2", "vm3"]),
            vm_provider=os.getenv("MONITOR_VM_PROVIDER", "orbstack").strip().lower() or "orbstack",
        ),
        clubcrm=ClubcrmSettings(
            demo_url=os.getenv("CLUBCRM_DEMO_URL", "http://clubcrm.local/demo/failover"),
        ),
    )
