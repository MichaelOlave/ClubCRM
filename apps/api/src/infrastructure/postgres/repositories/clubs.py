from src.infrastructure.postgres.client import PostgresClient
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club


class PostgresClubRepository(ClubRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def list_clubs(self, organization_id: str) -> list[Club]:
        _ = organization_id
        raise NotImplementedError(
            "Relational club persistence is not implemented yet. "
            "This adapter exists to anchor the folder structure and dependency boundary."
        )
