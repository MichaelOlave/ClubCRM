from src.modules.dashboard.application.queries import DashboardSummaryQuery
from src.modules.dashboard.domain.models import DashboardSummary


class GetDashboardSummaryHandler:
    async def handle(self, query: DashboardSummaryQuery) -> DashboardSummary:
        # Placeholder counts — we'll wire real DB queries in next
        return DashboardSummary(
            club_id=query.club_id,
            total_members=0,
            total_events=0,
            total_announcements=0,
        )
