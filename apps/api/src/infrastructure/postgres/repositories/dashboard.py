from sqlalchemy import func, select

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import (
    AnnouncementModel,
    ClubModel,
    EventModel,
    MembershipModel,
)
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.domain.models import DashboardSummary


class PostgresDashboardRepository(DashboardRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def get_summary(self, club_id: str) -> DashboardSummary | None:
        with self.client.create_session() as session:
            club_exists = session.scalar(select(ClubModel.id).where(ClubModel.id == club_id))
            if club_exists is None:
                return None

            total_members = session.scalar(
                select(func.count(MembershipModel.id)).where(MembershipModel.club_id == club_id)
            )
            total_events = session.scalar(
                select(func.count(EventModel.id)).where(EventModel.club_id == club_id)
            )
            total_announcements = session.scalar(
                select(func.count(AnnouncementModel.id)).where(AnnouncementModel.club_id == club_id)
            )

            return DashboardSummary(
                club_id=club_id,
                total_members=int(total_members or 0),
                total_events=int(total_events or 0),
                total_announcements=int(total_announcements or 0),
            )
