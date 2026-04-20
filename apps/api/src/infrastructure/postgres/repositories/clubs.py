from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import ClubModel
from src.modules.clubs.application.ports.club_repository import (
    ClubConflictError,
    ClubRepository,
)
from src.modules.clubs.domain.entities import Club
from src.modules.clubs.domain.slug import slugify_club_name


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

    def get_club_by_slug(
        self,
        organization_id: str | None,
        club_slug: str,
    ) -> Club | None:
        with self.client.create_session() as session:
            statement = select(ClubModel).where(ClubModel.slug == club_slug)
            if organization_id is not None:
                statement = statement.where(ClubModel.organization_id == organization_id)

            row = session.execute(statement).scalar_one_or_none()
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
                slug=self._build_unique_slug(session, organization_id, slugify_club_name(name)),
                name=name,
                description=description,
                status=status,
            )
            session.add(row)
            self._commit(session)
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
                row.slug = self._build_unique_slug(
                    session,
                    row.organization_id,
                    slugify_club_name(name),
                    excluded_club_id=row.id,
                )
            if description is not None:
                row.description = description
            if status is not None:
                row.status = status

            self._commit(session)
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

    def _commit(self, session) -> None:
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ClubConflictError("Club URLs must stay unique within an organization.") from exc

    def _build_unique_slug(
        self,
        session,
        organization_id: str,
        base_slug: str,
        *,
        excluded_club_id: str | None = None,
    ) -> str:
        statement = select(ClubModel.slug).where(ClubModel.organization_id == organization_id)
        if excluded_club_id is not None:
            statement = statement.where(ClubModel.id != excluded_club_id)

        existing_slugs = set(session.execute(statement).scalars().all())
        if base_slug not in existing_slugs:
            return base_slug

        suffix = 2
        while True:
            candidate = f"{base_slug}-{suffix}"
            if candidate not in existing_slugs:
                return candidate
            suffix += 1

    def _to_domain(self, row: ClubModel) -> Club:
        return Club(
            id=row.id,
            organization_id=row.organization_id,
            slug=row.slug,
            name=row.name,
            description=row.description,
            status=row.status,
        )
