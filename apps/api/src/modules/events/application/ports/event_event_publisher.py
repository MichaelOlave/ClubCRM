from abc import ABC, abstractmethod

from src.modules.events.domain.entities import Event


class EventEventPublisher(ABC):
    @abstractmethod
    def publish_event_created(self, event: Event) -> None:
        """Publish an event-created event outside the core write path."""
