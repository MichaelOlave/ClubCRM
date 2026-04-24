from fastapi import HTTPException, Request, status
from starlette.requests import HTTPConnection

from src.config import Settings, get_settings
from src.modules.cluster.application.event_bus import EventBus
from src.modules.cluster.application.runtime import ClusterRuntime
from src.modules.cluster.application.state import ClusterState
from src.modules.cluster.application.websocket_hub import WebSocketHub
from src.modules.cluster.infrastructure.kubernetes_watch import KubernetesWatchAdapter
from src.modules.cluster.infrastructure.recording_store import ClusterRecordingStore


def build_cluster_state() -> ClusterState:
    return ClusterState()


def build_event_bus() -> EventBus:
    return EventBus()


def build_websocket_hub() -> WebSocketHub:
    return WebSocketHub()


def build_kubernetes_adapter(settings: Settings) -> KubernetesWatchAdapter:
    return KubernetesWatchAdapter(settings.cluster)


def build_cluster_recording_store(settings: Settings) -> ClusterRecordingStore:
    return ClusterRecordingStore(settings.cluster.recording_file)


def build_cluster_runtime(
    *,
    settings: Settings,
    state: ClusterState,
    event_bus: EventBus,
    websocket_hub: WebSocketHub,
    kubernetes_adapter: KubernetesWatchAdapter,
    recording_store: ClusterRecordingStore,
) -> ClusterRuntime:
    return ClusterRuntime(
        settings=settings.cluster,
        state=state,
        event_bus=event_bus,
        websocket_hub=websocket_hub,
        kubernetes_adapter=kubernetes_adapter,
        recording_store=recording_store,
    )


def get_cluster_state(connection: HTTPConnection) -> ClusterState:
    return connection.app.state.cluster_state


def get_event_bus(connection: HTTPConnection) -> EventBus:
    return connection.app.state.event_bus


def get_websocket_hub(connection: HTTPConnection) -> WebSocketHub:
    return connection.app.state.websocket_hub


def get_kubernetes_adapter(connection: HTTPConnection) -> KubernetesWatchAdapter:
    return connection.app.state.kubernetes_adapter


def get_cluster_recording_store(connection: HTTPConnection) -> ClusterRecordingStore:
    return connection.app.state.cluster_recording_store


def _extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


def require_viewer_access(request: Request) -> None:
    settings = get_settings()
    if settings.auth.viewer_public or settings.auth.admin_token is None:
        return
    if _extract_bearer_token(request) != settings.auth.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid viewer token.",
        )
