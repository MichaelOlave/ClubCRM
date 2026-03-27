from abc import ABC, abstractmethod

from src.modules.clubs.domain.entities import Club


class ClubEventPublisher(ABC):
    @abstractmethod
    def publish_club_created(self, club: Club) -> None:
        """Publish a club-created event outside the core write path."""
