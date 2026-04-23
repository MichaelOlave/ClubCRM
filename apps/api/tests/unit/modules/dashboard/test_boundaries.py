import asyncio
import unittest

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.dashboard.application.handlers import (
    GetDashboardOverviewHandler,
    GetDashboardSummaryHandler,
)
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.application.queries import DashboardOverviewQuery, DashboardSummaryQuery
from src.modules.dashboard.domain.models import (
    DashboardOverview,
    DashboardOverviewActivity,
    DashboardOverviewClubSummary,
    DashboardOverviewMetrics,
    DashboardOverviewScope,
    DashboardRedisAnalytics,
    DashboardSummary,
)


class FakeDashboardRepository(DashboardRepository):
    def __init__(self) -> None:
        self.summary = DashboardSummary(
            club_id="club-1",
            total_members=12,
            total_events=3,
            total_announcements=5,
        )
        self.overview = DashboardOverview(
            scope=DashboardOverviewScope(
                organization_id="org-1",
                primary_role="org_admin",
                club_ids=(),
            ),
            metrics=DashboardOverviewMetrics(
                accessible_club_count=1,
                active_club_count=1,
                unique_member_count=12,
                pending_membership_count=2,
                upcoming_event_count=3,
                announcement_count=5,
                multi_club_member_count=4,
            ),
            clubs=(
                DashboardOverviewClubSummary(
                    id="club-1",
                    organization_id="org-1",
                    slug="chess-club",
                    name="Chess Club",
                    description="Strategy and tournaments.",
                    status="active",
                    member_count=12,
                    manager_name="Alex Smith",
                    next_event_at="2026-05-01T18:00:00+00:00",
                ),
            ),
            recent_activity=(
                DashboardOverviewActivity(
                    id="event-1",
                    club_id="club-1",
                    club_slug="chess-club",
                    club_name="Chess Club",
                    type="event",
                    title="Spring Open",
                    description="Student Center",
                    timestamp="2026-04-24T18:00:00+00:00",
                ),
            ),
        )
        self.summary_calls = 0
        self.overview_calls = 0

    def get_summary(self, club_id: str) -> DashboardSummary | None:
        self.summary_calls += 1
        if club_id != self.summary.club_id:
            return None
        return self.summary

    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
    ) -> DashboardOverview:
        self.overview_calls += 1
        return self.overview


class FakeDashboardSummaryCache(DashboardSummaryCache):
    def __init__(self) -> None:
        self.values: dict[str, DashboardSummary] = {}
        self.overview_values: dict[str, DashboardOverview] = {}

    def _overview_key(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
    ) -> str:
        return f"{organization_id}:{primary_role}:{','.join(club_ids)}"

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

    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
    ) -> DashboardOverview | None:
        return self.overview_values.get(
            self._overview_key(
                organization_id=organization_id,
                primary_role=primary_role,
                club_ids=club_ids,
            )
        )

    def set_overview(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
        overview: DashboardOverview,
    ) -> None:
        self.overview_values[
            self._overview_key(
                organization_id=organization_id,
                primary_role=primary_role,
                club_ids=club_ids,
            )
        ] = overview


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
        self.assertEqual(repository.summary_calls, 0)

    def test_dashboard_summary_handler_populates_cache_after_repository_miss(self) -> None:
        repository = FakeDashboardRepository()
        cache = FakeDashboardSummaryCache()

        result = asyncio.run(
            GetDashboardSummaryHandler(repository=repository, cache=cache).handle(
                DashboardSummaryQuery(club_id="club-1")
            )
        )

        self.assertEqual(result.total_announcements, 5)
        self.assertEqual(repository.summary_calls, 1)
        self.assertEqual(cache.values["club-1"], repository.summary)

    def test_dashboard_overview_handler_uses_cache_before_repository(self) -> None:
        repository = FakeDashboardRepository()
        cache = FakeDashboardSummaryCache()
        query = DashboardOverviewQuery(
            organization_id="org-1",
            primary_role="org_admin",
            club_ids=(),
        )
        cache.set_overview(
            organization_id=query.organization_id,
            primary_role=query.primary_role,
            club_ids=query.club_ids,
            overview=repository.overview,
        )

        result = asyncio.run(
            GetDashboardOverviewHandler(repository=repository, cache=cache).handle(query)
        )

        self.assertEqual(result.metrics.accessible_club_count, 1)
        self.assertEqual(repository.overview_calls, 0)

    def test_dashboard_overview_handler_populates_cache_after_repository_miss(self) -> None:
        repository = FakeDashboardRepository()
        cache = FakeDashboardSummaryCache()
        query = DashboardOverviewQuery(
            organization_id="org-1",
            primary_role="org_admin",
            club_ids=(),
        )

        result = asyncio.run(
            GetDashboardOverviewHandler(repository=repository, cache=cache).handle(query)
        )

        self.assertEqual(result.metrics.announcement_count, 5)
        self.assertEqual(repository.overview_calls, 1)
        self.assertEqual(
            cache.overview_values["org-1:org_admin:"],
            repository.overview,
        )
