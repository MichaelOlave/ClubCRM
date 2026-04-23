from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, status

from src.bootstrap.dependencies import (
    get_cluster_state,
    get_websocket_hub,
    require_viewer_access,
)
from src.config import get_settings
from src.modules.cluster.application.state import ClusterState
from src.modules.cluster.application.websocket_hub import WebSocketHub

router = APIRouter(tags=["cluster"])

ClusterStateDep = Annotated[ClusterState, Depends(get_cluster_state)]
WebSocketHubDep = Annotated[WebSocketHub, Depends(get_websocket_hub)]


@router.get("/api/snapshot", dependencies=[Depends(require_viewer_access)])
async def get_snapshot(state: ClusterStateDep) -> dict:
    return await state.snapshot()


@router.websocket("/ws/stream")
async def stream_cluster(
    websocket: WebSocket,
    state: ClusterStateDep,
    hub: WebSocketHubDep,
) -> None:
    if not _websocket_allowed(websocket):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await hub.connect(websocket)
    try:
        await websocket.send_json(await state.snapshot())
        await hub.wait_for_disconnect(websocket)
    finally:
        hub.disconnect(websocket)


def _websocket_allowed(websocket: WebSocket) -> bool:
    settings = get_settings()
    if settings.auth.viewer_public or settings.auth.admin_token is None:
        return True

    authorization = websocket.headers.get("authorization", "")
    scheme, _, bearer = authorization.partition(" ")
    if scheme.lower() == "bearer" and bearer.strip() == settings.auth.admin_token:
        return True

    token_param = websocket.query_params.get("token")
    return token_param is not None and token_param.strip() == settings.auth.admin_token
