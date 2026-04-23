from abc import ABC, abstractmethod
from typing import Literal

from src.modules.dashboard.domain.models import (
    DashboardOverview,
    DashboardRedisAnalytics,
    DashboardSummary,
)


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

    @abstractmethod
    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: Literal["org_admin", "club_manager"],
        club_ids: tuple[str, ...],
    ) -> DashboardOverview | None:
        """Return a cached dashboard overview when present."""

    @abstractmethod
    def set_overview(
        self,
        *,
        organization_id: str,
        primary_role: Literal["org_admin", "club_manager"],
        club_ids: tuple[str, ...],
        overview: DashboardOverview,
    ) -> None:
        """Store the access-scoped dashboard overview."""
