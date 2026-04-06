from dataclasses import dataclass

from src.modules.events.application.ports.event_repository import EventRepository
from src.modules.events.domain.entities import Event


@dataclass
class GetEvent:
    repository: EventRepository

    def execute(self, event_id: str) -> Event:
        return self.repository.get_event(event_id)
