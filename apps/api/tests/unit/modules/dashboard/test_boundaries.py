import asyncio
import unittest

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.dashboard.application.handlers import GetDashboardSummaryHandler
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.application.queries import DashboardSummaryQuery
from src.modules.dashboard.domain.models import DashboardRedisAnalytics, DashboardSummary


class FakeDashboardRepository(DashboardRepository):
    def __init__(self) -> None:
        self.summary = DashboardSummary(
            club_id="club-1",
            total_members=12,
            total_events=3,
            total_announcements=5,
        )
        self.calls = 0

    def get_summary(self, club_id: str) -> DashboardSummary | None:
        self.calls += 1
        if club_id != self.summary.club_id:
            return None
        return self.summary


class FakeDashboardSummaryCache(DashboardSummaryCache):
    def __init__(self) -> None:
        self.values: dict[str, DashboardSummary] = {}

    def get(self, club_id: str) -> DashboardSummary | None:
        return self.values.get(club_id)

    def set(self, club_id: str, summary: DashboardSummary) -> None:
        self.values[club_id] = summary

    def delete(self, club_id: str) -> None:
        self.values.pop(club_id, None)

    def get_analytics(self, club_id: str) -> DashboardRedisAnalytics:
        return DashboardRedisAnalytics(
            club_id=club_id,
            cache_key=f"clubcrm:dashboard:summary:{club_id}",
            available=True,
            cache_present=club_id in self.values,
            ttl_seconds=90 if club_id in self.values else None,
            request_count=1,
            hit_count=1 if club_id in self.values else 0,
            miss_count=0 if club_id in self.values else 1,
            refresh_count=1 if club_id in self.values else 0,
            invalidation_count=0,
            hit_rate=1.0 if club_id in self.values else 0.0,
            status="warm" if club_id in self.values else "cold",
        )


class DashboardBoundaryTests(unittest.TestCase):
    def test_dashboard_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/dashboard/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_dashboard_summary_handler_uses_cache_before_repository(self) -> None:
        repository = FakeDashboardRepository()
        cache = FakeDashboardSummaryCache()
        cache.values["club-1"] = repository.summary

        result = asyncio.run(
            GetDashboardSummaryHandler(repository=repository, cache=cache).handle(
                DashboardSummaryQuery(club_id="club-1")
            )
        )

        self.assertEqual(result.total_members, 12)
        self.assertEqual(repository.calls, 0)

    def test_dashboard_summary_handler_populates_cache_after_repository_miss(self) -> None:
        repository = FakeDashboardRepository()
        cache = FakeDashboardSummaryCache()

        result = asyncio.run(
            GetDashboardSummaryHandler(repository=repository, cache=cache).handle(
                DashboardSummaryQuery(club_id="club-1")
            )
        )

        self.assertEqual(result.total_announcements, 5)
        self.assertEqual(repository.calls, 1)
        self.assertEqual(cache.values["club-1"], repository.summary)
