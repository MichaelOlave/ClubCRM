from abc import ABC, abstractmethod


class DashboardRepository(ABC):
    @abstractmethod
    def count_members(self, club_id: str) -> int:
        """Return total members for a club."""

    @abstractmethod
    def count_events(self, club_id: str) -> int:
        """Return total events for a club."""

    @abstractmethod
    def count_announcements(self, club_id: str) -> int:
        """Return total announcements for a club."""
