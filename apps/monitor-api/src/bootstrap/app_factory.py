from fastapi import FastAPI

from src.config import get_settings
from src.presentation.http.router import build_api_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.api.title)
    app.include_router(build_api_router())
    return app
