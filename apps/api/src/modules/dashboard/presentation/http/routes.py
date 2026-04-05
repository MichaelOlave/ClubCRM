from fastapi import APIRouter

from src.modules.dashboard.application.handlers import GetDashboardSummaryHandler
from src.modules.dashboard.application.queries import DashboardSummaryQuery

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary/{club_id}")
async def get_dashboard_summary(club_id: str):
    handler = GetDashboardSummaryHandler()
    query = DashboardSummaryQuery(club_id=club_id)
    result = await handler.handle(query)
    return result
