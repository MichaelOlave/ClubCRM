from src.infrastructure.postgres.client import PostgresClient
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository


class PostgresDashboardRepository(DashboardRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def count_members(self, club_id: str) -> int:
        _ = club_id
        raise NotImplementedError("Dashboard member count not implemented yet.")

    def count_events(self, club_id: str) -> int:
        _ = club_id
        raise NotImplementedError("Dashboard event count not implemented yet.")

    def count_announcements(self, club_id: str) -> int:
        _ = club_id
        raise NotImplementedError("Dashboard announcement count not implemented yet.")
