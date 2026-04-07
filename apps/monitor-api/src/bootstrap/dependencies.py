from fastapi import HTTPException, Request, status
from starlette.requests import HTTPConnection

from src.config import Settings, get_settings
from src.modules.monitoring.application.services import MonitoringRuntime, WebSocketHub
from src.modules.monitoring.application.state import MonitoringState
from src.modules.monitoring.infrastructure.kubernetes import KubernetesCommandAdapter
from src.modules.monitoring.infrastructure.orbstack import OrbStackSSHAdapter


def build_monitoring_state(settings: Settings) -> MonitoringState:
    return MonitoringState(
        target_vms=settings.monitoring.target_vms,
        history_limit=settings.synthetic.history_limit,
        event_limit=settings.synthetic.event_limit,
        stale_after_seconds=settings.synthetic.stale_after_seconds,
        latency_spike_threshold_ms=settings.synthetic.latency_spike_threshold_ms,
        synthetic_target_url=settings.synthetic.target_url,
    )


def build_websocket_hub() -> WebSocketHub:
    return WebSocketHub()


def build_orbstack_adapter(settings: Settings) -> OrbStackSSHAdapter:
    return OrbStackSSHAdapter(settings.orbstack)


def build_kubernetes_adapter(settings: Settings) -> KubernetesCommandAdapter:
    return KubernetesCommandAdapter(settings.kubernetes)


def build_monitoring_runtime(
    *,
    settings: Settings,
    monitoring_state: MonitoringState,
    websocket_hub: WebSocketHub,
    orbstack_adapter: OrbStackSSHAdapter,
    kubernetes_adapter: KubernetesCommandAdapter,
) -> MonitoringRuntime:
    return MonitoringRuntime(
        settings=settings,
        state=monitoring_state,
        websocket_hub=websocket_hub,
        orbstack_adapter=orbstack_adapter,
        kubernetes_adapter=kubernetes_adapter,
    )


def get_monitoring_state(connection: HTTPConnection) -> MonitoringState:
    return connection.app.state.monitoring_state


def get_websocket_hub(connection: HTTPConnection) -> WebSocketHub:
    return connection.app.state.websocket_hub


def get_orbstack_adapter(connection: HTTPConnection) -> OrbStackSSHAdapter:
    return connection.app.state.orbstack_adapter


def get_kubernetes_adapter(connection: HTTPConnection) -> KubernetesCommandAdapter:
    return connection.app.state.kubernetes_adapter


def _extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


def require_admin_token(request: Request) -> None:
    token = _extract_bearer_token(request)
    if token != get_settings().auth.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid monitoring admin token.",
        )


def require_agent_token(request: Request, vm_id: str) -> None:
    token = _extract_bearer_token(request)
    expected_token = get_settings().auth.agent_tokens.get(vm_id)
    if token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Missing or invalid agent token for '{vm_id}'.",
        )
