from fastapi import APIRouter

from src.modules.announcements.presentation.http.routes import router as announcements_router
from src.modules.audit.presentation.http.routes import router as audit_router
from src.modules.auth.presentation.http.routes import router as auth_router
from src.modules.clubs.presentation.http.routes import router as clubs_router
from src.modules.dashboard.presentation.http.routes import router as dashboard_router
from src.modules.events.presentation.http.routes import router as events_router
from src.modules.forms.presentation.http.routes import router as forms_router
from src.modules.members.presentation.http.routes import router as members_router
from src.modules.memberships.presentation.http.routes import router as memberships_router
from src.modules.system.presentation.http.routes import router as system_router


def build_api_router() -> APIRouter:
    router = APIRouter()
    router.include_router(system_router)
    router.include_router(auth_router)
    router.include_router(audit_router)
    router.include_router(announcements_router)
    router.include_router(clubs_router)
    router.include_router(events_router)
    router.include_router(forms_router)
    router.include_router(dashboard_router)
    router.include_router(members_router)
    router.include_router(memberships_router)
    return router
