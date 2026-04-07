import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.bootstrap.dependencies import (
    build_kubernetes_adapter,
    build_monitoring_runtime,
    build_monitoring_state,
    build_orbstack_adapter,
    build_websocket_hub,
)
from src.config import get_settings
from src.presentation.http.router import build_api_router


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        monitoring_state = build_monitoring_state(settings)
        websocket_hub = build_websocket_hub()
        orbstack_adapter = build_orbstack_adapter(settings)
        kubernetes_adapter = build_kubernetes_adapter(settings)
        runtime = build_monitoring_runtime(
            settings=settings,
            monitoring_state=monitoring_state,
            websocket_hub=websocket_hub,
            orbstack_adapter=orbstack_adapter,
            kubernetes_adapter=kubernetes_adapter,
        )
        app.state.monitoring_state = monitoring_state
        app.state.websocket_hub = websocket_hub
        app.state.orbstack_adapter = orbstack_adapter
        app.state.kubernetes_adapter = kubernetes_adapter
        app.state.monitoring_runtime = runtime
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
