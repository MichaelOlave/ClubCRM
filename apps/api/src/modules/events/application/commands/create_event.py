from dataclasses import dataclass
from datetime import datetime

from src.modules.events.application.ports.event_repository import EventRepository
from src.modules.events.domain.entities import Event


@dataclass
class CreateEvent:
    repository: EventRepository

    def execute(
        self,
        *,
        club_id: str,
        title: str,
        description: str,
        starts_at: datetime,
        location: str | None = None,
        ends_at: datetime | None = None,
    ) -> Event:
        return self.repository.create_event(
            club_id=club_id,
            title=title,
            description=description,
            starts_at=starts_at,
            location=location,
            ends_at=ends_at,
        )
