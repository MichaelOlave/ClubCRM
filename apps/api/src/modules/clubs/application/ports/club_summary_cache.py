from abc import ABC, abstractmethod

from src.modules.clubs.domain.entities import Club


class ClubSummaryCache(ABC):
    @abstractmethod
    def get(self, organization_id: str) -> list[Club] | None:
        """Return cached clubs for an organization if present."""

    @abstractmethod
    def set(self, organization_id: str, clubs: list[Club]) -> None:
        """Store a club summary for an organization."""
