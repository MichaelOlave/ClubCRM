from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import ClubModel
from src.modules.clubs.application.ports.club_repository import (
    ClubConflictError,
    ClubRepository,
)
from src.modules.clubs.domain.entities import Club


class PostgresClubRepository(ClubRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def list_clubs(self, organization_id: str | None = None) -> list[Club]:
        with self.client.create_session() as session:
            statement = select(ClubModel)
            if organization_id is not None:
                statement = statement.where(ClubModel.organization_id == organization_id)

            rows = session.execute(statement.order_by(ClubModel.name)).scalars().all()
            return [self._to_domain(row) for row in rows]

    def get_club(self, club_id: str) -> Club | None:
        with self.client.create_session() as session:
            row = session.get(ClubModel, club_id)
            if row is None:
                return None

            return self._to_domain(row)

    def create_club(
        self,
        organization_id: str,
        name: str,
        description: str,
        status: str,
    ) -> Club:
        with self.client.create_session() as session:
            row = ClubModel(
                organization_id=organization_id,
                name=name,
                description=description,
                status=status,
            )
            session.add(row)
            self._commit(session, "Could not create club with the provided data.")
            session.refresh(row)
            return self._to_domain(row)

    def update_club(
        self,
        club_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
    ) -> Club | None:
        with self.client.create_session() as session:
            row = session.get(ClubModel, club_id)
            if row is None:
                return None

            if name is not None:
                row.name = name
            if description is not None:
                row.description = description
            if status is not None:
                row.status = status

            self._commit(session, "Could not update club with the provided data.")
            session.refresh(row)
            return self._to_domain(row)

    def delete_club(self, club_id: str) -> bool:
        with self.client.create_session() as session:
            row = session.get(ClubModel, club_id)
            if row is None:
                return False

            session.delete(row)
            session.commit()
            return True

    def _commit(self, session, message: str) -> None:
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ClubConflictError(message) from exc

    def _to_domain(self, row: ClubModel) -> Club:
        return Club(
            id=row.id,
            organization_id=row.organization_id,
            name=row.name,
            description=row.description,
            status=row.status,
        )
