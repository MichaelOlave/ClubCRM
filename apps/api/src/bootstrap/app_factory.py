import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from starlette.requests import Request
from starlette.responses import Response

from src.bootstrap.dependencies import get_kafka_client
from src.config import get_settings
from src.presentation.http.exception_handlers import register_exception_handlers
from src.presentation.http.router import build_api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI):
    kafka_client = get_kafka_client()
    try:
        kafka_client.start()
    except Exception:
        logger.exception("kafka producer startup failed; continuing without broker writes")
    try:
        yield
    finally:
        try:
            kafka_client.stop()
        except Exception:
            logger.exception("kafka producer shutdown failed")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.api.title, lifespan=_lifespan)

    @app.middleware("http")
    async def attach_request_id(request: Request, call_next) -> Response:
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-Id"] = request.state.request_id
        return response

    register_exception_handlers(app)
    app.include_router(build_api_router())
    return app
