from dataclasses import dataclass
from datetime import datetime

from src.modules.events.application.ports.event_repository import UNSET, EventRepository
from src.modules.events.domain.entities import Event


@dataclass
class UpdateEvent:
    repository: EventRepository

    def execute(
        self,
        event_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        starts_at: datetime | None = None,
        location: str | None | object = UNSET,
        ends_at: datetime | None | object = UNSET,
    ) -> Event:
        return self.repository.update_event(
            event_id,
            title=title,
            description=description,
            starts_at=starts_at,
            location=location,
            ends_at=ends_at,
        )
