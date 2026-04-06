from dataclasses import dataclass

from src.modules.events.application.ports.event_repository import EventRepository
from src.modules.events.domain.entities import Event


@dataclass
class ListEvents:
    repository: EventRepository

    def execute(self, club_id: str) -> list[Event]:
        return self.repository.list_events(club_id)
