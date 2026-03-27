from abc import ABC, abstractmethod

from src.modules.clubs.domain.entities import Club


class ClubRepository(ABC):
    @abstractmethod
    def list_clubs(self, organization_id: str) -> list[Club]:
        """Return clubs for a single organization."""
