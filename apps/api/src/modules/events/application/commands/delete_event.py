from dataclasses import dataclass

from src.modules.events.application.ports.event_repository import EventRepository


@dataclass
class DeleteEvent:
    repository: EventRepository

    def execute(self, event_id: str) -> None:
        self.repository.delete_event(event_id)
