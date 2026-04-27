from dataclasses import dataclass
from datetime import datetime

from src.modules.events.application.ports.event_event_publisher import (
    EventEventPublisher,
)
from src.modules.events.application.ports.event_repository import EventRepository
from src.modules.events.domain.entities import Event


@dataclass
class CreateEvent:
    repository: EventRepository
    publisher: EventEventPublisher | None = None

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
        created = self.repository.create_event(
            club_id=club_id,
            title=title,
            description=description,
            starts_at=starts_at,
            location=location,
            ends_at=ends_at,
        )

        if self.publisher is not None:
            self.publisher.publish_event_created(created)

        return created
