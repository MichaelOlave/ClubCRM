from abc import ABC, abstractmethod

from src.modules.dashboard.domain.models import DashboardRedisAnalytics, DashboardSummary


class DashboardSummaryCache(ABC):
    @abstractmethod
    def get(self, club_id: str) -> DashboardSummary | None:
        """Return a cached dashboard summary for the club when present."""

    @abstractmethod
    def set(self, club_id: str, summary: DashboardSummary) -> None:
        """Store a dashboard summary for the club."""

    @abstractmethod
    def delete(self, club_id: str) -> None:
        """Invalidate the cached dashboard summary for the club."""

    @abstractmethod
    def get_analytics(self, club_id: str) -> DashboardRedisAnalytics:
        """Return Redis cache analytics for a club dashboard summary."""
