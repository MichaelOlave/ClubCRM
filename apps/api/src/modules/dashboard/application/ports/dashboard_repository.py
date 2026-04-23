from abc import ABC, abstractmethod
from typing import Literal

from src.modules.dashboard.domain.models import DashboardOverview, DashboardSummary


class DashboardRepository(ABC):
    @abstractmethod
    def get_summary(self, club_id: str) -> DashboardSummary | None:
        """Return the canonical dashboard summary for a club."""

    @abstractmethod
    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: Literal["org_admin", "club_manager"],
        club_ids: tuple[str, ...],
    ) -> DashboardOverview:
        """Return the access-scoped dashboard overview for the current user."""
