from fastapi import APIRouter, Depends

from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import (
    ensure_club_access,
    require_authorized_access,
)
from src.modules.dashboard.application.handlers import GetDashboardSummaryHandler
from src.modules.dashboard.application.queries import DashboardSummaryQuery

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary/{club_id}")
async def get_dashboard_summary(
    club_id: str,
    access: AppAccess = Depends(require_authorized_access),  # noqa: B008
):
    ensure_club_access(access, club_id)
    handler = GetDashboardSummaryHandler()
    query = DashboardSummaryQuery(club_id=club_id)
    result = await handler.handle(query)
    return result
