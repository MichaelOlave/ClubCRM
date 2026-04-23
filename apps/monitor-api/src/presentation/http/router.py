from fastapi import APIRouter

from src.modules.cluster.presentation.http.routes import router as cluster_router
from src.modules.system.presentation.http.routes import router as system_router


def build_api_router() -> APIRouter:
    router = APIRouter()
    router.include_router(system_router)
    router.include_router(cluster_router)
    return router
