from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import EventModel
from src.modules.events.application.ports.event_repository import (
    EventConflictError,
    EventRepository,
)
from src.modules.events.domain.entities import Event


class PostgresEventRepository(EventRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    @staticmethod
    def _to_event(row: EventModel) -> Event:
        return Event(
            id=row.id,
            club_id=row.club_id,
            title=row.title,
            description=row.description,
            location=row.location,
            starts_at=row.starts_at,
            ends_at=row.ends_at,
            created_at=row.created_at,
        )

    def list_events(self, club_id: str) -> list[Event]:
        with self.client.create_session() as session:
            rows = (
                session.execute(
                    select(EventModel)
                    .where(EventModel.club_id == club_id)
                    .order_by(EventModel.starts_at, EventModel.created_at, EventModel.id)
                )
                .scalars()
                .all()
            )
            return [self._to_event(row) for row in rows]

    def get_event(self, event_id: str) -> Event:
        with self.client.create_session() as session:
            row = session.get(EventModel, event_id)
            if row is None:
                raise LookupError(f"Event {event_id} not found.")

            return self._to_event(row)

    def create_event(
        self,
        *,
        club_id: str,
        title: str,
        description: str,
        starts_at: datetime,
        location: str | None = None,
        ends_at: datetime | None = None,
    ) -> Event:
        with self.client.create_session() as session:
            row = EventModel(
                club_id=club_id,
                title=title,
                description=description,
                starts_at=starts_at,
                location=location,
                ends_at=ends_at,
            )
            session.add(row)
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise EventConflictError("Event could not be created.") from exc
            session.refresh(row)
            return self._to_event(row)

    def update_event(
        self,
        event_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        starts_at: datetime | None = None,
        location: str | None = None,
        ends_at: datetime | None = None,
    ) -> Event:
        with self.client.create_session() as session:
            row = session.get(EventModel, event_id)
            if row is None:
                raise LookupError(f"Event {event_id} not found.")

            if title is not None:
                row.title = title
            if description is not None:
                row.description = description
            if starts_at is not None:
                row.starts_at = starts_at
            if location is not None:
                row.location = location
            if ends_at is not None:
                row.ends_at = ends_at

            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise EventConflictError("Event could not be updated.") from exc
            session.refresh(row)
            return self._to_event(row)

    def delete_event(self, event_id: str) -> None:
        with self.client.create_session() as session:
            row = session.get(EventModel, event_id)
            if row is None:
                raise LookupError(f"Event {event_id} not found.")

            session.delete(row)
            session.commit()
