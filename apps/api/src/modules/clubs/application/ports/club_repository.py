from abc import ABC, abstractmethod

from src.modules.clubs.domain.entities import Club


class ClubConflictError(ValueError):
    """Raised when a club write conflicts with relational constraints."""


class ClubRepository(ABC):
    @abstractmethod
    def list_clubs(self, organization_id: str | None = None) -> list[Club]:
        """Return clubs, optionally scoped to a single organization."""

    @abstractmethod
    def get_club(self, club_id: str) -> Club | None:
        """Return one club when it exists."""

    @abstractmethod
    def get_club_by_slug(
        self,
        organization_id: str | None,
        club_slug: str,
    ) -> Club | None:
        """Return one club by slug when it exists."""

    @abstractmethod
    def create_club(
        self,
        organization_id: str,
        name: str,
        description: str,
        status: str,
    ) -> Club:
        """Create a club record."""

    @abstractmethod
    def update_club(
        self,
        club_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
    ) -> Club | None:
        """Update a club record when it exists."""

    @abstractmethod
    def delete_club(self, club_id: str) -> bool:
        """Delete a club when it exists."""
