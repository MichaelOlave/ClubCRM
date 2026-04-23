import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.bootstrap.dependencies import (
    build_cluster_runtime,
    build_cluster_state,
    build_event_bus,
    build_kubernetes_adapter,
    build_websocket_hub,
)
from src.config import get_settings
from src.presentation.http.router import build_api_router


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        cluster_state = build_cluster_state()
        event_bus = build_event_bus()
        websocket_hub = build_websocket_hub()
        kubernetes_adapter = build_kubernetes_adapter(settings)
        runtime = build_cluster_runtime(
            settings=settings,
            state=cluster_state,
            event_bus=event_bus,
            websocket_hub=websocket_hub,
            kubernetes_adapter=kubernetes_adapter,
        )

        app.state.cluster_state = cluster_state
        app.state.event_bus = event_bus
        app.state.websocket_hub = websocket_hub
        app.state.kubernetes_adapter = kubernetes_adapter
        app.state.cluster_runtime = runtime

        background_tasks_enabled = (
            os.getenv("MONITOR_DISABLE_BACKGROUND_TASKS", "").strip().lower()
            not in {"1", "true", "yes", "on"}
        )
        if background_tasks_enabled:
            await runtime.start()
        try:
            yield
        finally:
            if background_tasks_enabled:
                await runtime.stop()

    app = FastAPI(title=settings.api.title, lifespan=lifespan)
    app.include_router(build_api_router())
    return app
