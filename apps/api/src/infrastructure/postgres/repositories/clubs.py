from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from src.infrastructure.postgres.models.tables import ClubModel
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club

DATABASE_URL = "postgresql+psycopg://clubcrm:clubcrm@postgres:5432/clubcrm"


class PostgresClubRepository(ClubRepository):
    def __init__(self, client=None) -> None:
        self.engine = create_engine(DATABASE_URL)

    def list_clubs(self, organization_id: str) -> list[Club]:
        with Session(self.engine) as session:
            rows = (
                session.execute(
                    select(ClubModel).where(ClubModel.organization_id == organization_id)
                )
                .scalars()
                .all()
            )
            return [
                Club(
                    id=row.id,
                    organization_id=row.organization_id,
                    name=row.name,
                    description=row.description,
                    status=row.status,
                )
                for row in rows
            ]
