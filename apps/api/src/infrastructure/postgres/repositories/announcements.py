from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import AnnouncementModel
from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementConflictError,
    AnnouncementRepository,
)
from src.modules.announcements.domain.entities import Announcement


class PostgresAnnouncementRepository(AnnouncementRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    @staticmethod
    def _to_announcement(row: AnnouncementModel) -> Announcement:
        return Announcement(
            id=row.id,
            club_id=row.club_id,
            title=row.title,
            body=row.body,
            published_at=row.published_at,
            created_by=row.created_by,
        )

    def list_announcements(self, club_id: str) -> list[Announcement]:
        with self.client.create_session() as session:
            rows = (
                session.execute(
                    select(AnnouncementModel)
                    .where(AnnouncementModel.club_id == club_id)
                    .order_by(AnnouncementModel.published_at.desc(), AnnouncementModel.id.desc())
                )
                .scalars()
                .all()
            )
            return [self._to_announcement(row) for row in rows]

    def get_announcement(self, announcement_id: str) -> Announcement:
        with self.client.create_session() as session:
            row = session.get(AnnouncementModel, announcement_id)
            if row is None:
                raise LookupError(f"Announcement {announcement_id} not found.")

            return self._to_announcement(row)

    def create_announcement(
        self,
        *,
        club_id: str,
        title: str,
        body: str,
        published_at: datetime | None = None,
        created_by: str | None = None,
    ) -> Announcement:
        with self.client.create_session() as session:
            params = {
                "club_id": club_id,
                "title": title,
                "body": body,
                "created_by": created_by,
            }
            if published_at is not None:
                params["published_at"] = published_at

            row = AnnouncementModel(**params)
            session.add(row)
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise AnnouncementConflictError("Announcement could not be created.") from exc
            session.refresh(row)
            return self._to_announcement(row)

    def update_announcement(
        self,
        announcement_id: str,
        *,
        title: str | None = None,
        body: str | None = None,
        published_at: datetime | None = None,
        created_by: str | None = None,
    ) -> Announcement:
        with self.client.create_session() as session:
            row = session.get(AnnouncementModel, announcement_id)
            if row is None:
                raise LookupError(f"Announcement {announcement_id} not found.")

            if title is not None:
                row.title = title
            if body is not None:
                row.body = body
            if published_at is not None:
                row.published_at = published_at
            if created_by is not None:
                row.created_by = created_by

            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise AnnouncementConflictError("Announcement could not be updated.") from exc
            session.refresh(row)
            return self._to_announcement(row)

    def delete_announcement(self, announcement_id: str) -> None:
        with self.client.create_session() as session:
            row = session.get(AnnouncementModel, announcement_id)
            if row is None:
                raise LookupError(f"Announcement {announcement_id} not found.")

            session.delete(row)
            session.commit()
