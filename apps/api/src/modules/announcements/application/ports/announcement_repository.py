from abc import ABC, abstractmethod
from datetime import datetime

from src.modules.announcements.domain.entities import Announcement


class AnnouncementConflictError(ValueError):
    """Raised when an announcement write conflicts with relational constraints."""


class AnnouncementRepository(ABC):
    @abstractmethod
    def list_announcements(self, club_id: str) -> list[Announcement]:
        """Return announcements for a club."""

    @abstractmethod
    def get_announcement(self, announcement_id: str) -> Announcement:
        """Return one announcement by identifier."""

    @abstractmethod
    def create_announcement(
        self,
        *,
        club_id: str,
        title: str,
        body: str,
        published_at: datetime | None = None,
        created_by: str | None = None,
    ) -> Announcement:
        """Persist a new announcement."""

    @abstractmethod
    def update_announcement(
        self,
        announcement_id: str,
        *,
        title: str | None = None,
        body: str | None = None,
        published_at: datetime | None = None,
        created_by: str | None = None,
    ) -> Announcement:
        """Update an existing announcement."""

    @abstractmethod
    def delete_announcement(self, announcement_id: str) -> None:
        """Remove an announcement."""
