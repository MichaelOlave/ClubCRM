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
    admin_token: str | None
    viewer_public: bool


@dataclass(frozen=True)
class ClusterSettings:
    kubeconfig_path: str | None
    context: str | None
    in_cluster: bool
    snapshot_file: str | None
    longhorn_enabled: bool
    k8s_events_enabled: bool
    chaos_enabled: bool
    heartbeat_seconds: float
    watch_timeout_seconds: int


@dataclass(frozen=True)
class Settings:
    api: ApiSettings
    auth: AuthSettings
    cluster: ClusterSettings


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


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api=ApiSettings(
            title=os.getenv("MONITOR_API_TITLE", "ClubCRM Cluster Visualizer API"),
            host=os.getenv("MONITOR_API_HOST", "0.0.0.0"),
            port=_read_int_env("MONITOR_API_PORT", 8010),
            public_base_url=os.getenv("MONITOR_API_BASE_URL", "http://localhost:8010"),
        ),
        auth=AuthSettings(
            admin_token=_read_optional_env("MONITOR_ADMIN_TOKEN"),
            viewer_public=_read_bool_env("CLUSTER_VIEWER_PUBLIC", True),
        ),
        cluster=ClusterSettings(
            kubeconfig_path=_read_optional_env("MONITOR_CLUSTER_KUBECONFIG"),
            context=_read_optional_env("MONITOR_CLUSTER_CONTEXT"),
            in_cluster=_read_bool_env("MONITOR_CLUSTER_IN_CLUSTER", False),
            snapshot_file=_read_optional_env("MONITOR_CLUSTER_SNAPSHOT_FILE"),
            longhorn_enabled=_read_bool_env("MONITOR_LONGHORN_ENABLED", True),
            k8s_events_enabled=_read_bool_env("MONITOR_K8S_EVENTS_ENABLED", True),
            chaos_enabled=_read_bool_env("MONITOR_CHAOS_ENABLED", False),
            heartbeat_seconds=_read_float_env("MONITOR_CLUSTER_HEARTBEAT_SECONDS", 5.0),
            watch_timeout_seconds=_read_int_env("MONITOR_CLUSTER_WATCH_TIMEOUT_SECONDS", 300),
        ),
    )
