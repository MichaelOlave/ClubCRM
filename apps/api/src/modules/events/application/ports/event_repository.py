from abc import ABC, abstractmethod
from datetime import datetime

from src.modules.events.domain.entities import Event


class EventConflictError(ValueError):
    """Raised when an event write conflicts with relational constraints."""


class EventRepository(ABC):
    @abstractmethod
    def list_events(self, club_id: str) -> list[Event]:
        """Return events for a club."""

    @abstractmethod
    def get_event(self, event_id: str) -> Event:
        """Return one event by identifier."""

    @abstractmethod
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
        """Persist a new event."""

    @abstractmethod
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
        """Update an existing event."""

    @abstractmethod
    def delete_event(self, event_id: str) -> None:
        """Remove an event."""
