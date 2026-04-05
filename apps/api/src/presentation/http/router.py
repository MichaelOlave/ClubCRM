from fastapi import APIRouter

from src.modules.auth.presentation.http.routes import router as auth_router
from src.modules.clubs.presentation.http.routes import router as clubs_router
from src.modules.dashboard.presentation.http.routes import router as dashboard_router
from src.modules.forms.presentation.http.routes import router as forms_router
from src.modules.system.presentation.http.routes import router as system_router


def build_api_router() -> APIRouter:
    router = APIRouter()
    router.include_router(system_router)
    router.include_router(auth_router)
    router.include_router(clubs_router)
    router.include_router(forms_router)
    router.include_router(dashboard_router)
    return router
