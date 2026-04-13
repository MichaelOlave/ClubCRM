from abc import ABC, abstractmethod

from src.modules.dashboard.domain.models import DashboardSummary


class DashboardRepository(ABC):
    @abstractmethod
    def get_summary(self, club_id: str) -> DashboardSummary | None:
        """Return the canonical dashboard summary for a club."""
