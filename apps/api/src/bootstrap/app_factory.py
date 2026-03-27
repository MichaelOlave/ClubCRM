from fastapi import FastAPI

from src.config import get_settings
from src.presentation.http.exception_handlers import register_exception_handlers
from src.presentation.http.router import build_api_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.api.title)
    register_exception_handlers(app)
    app.include_router(build_api_router())
    return app
