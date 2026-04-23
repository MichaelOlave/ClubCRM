from dataclasses import dataclass

from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.application.queries import DashboardOverviewQuery, DashboardSummaryQuery
from src.modules.dashboard.domain.models import (
    DashboardOverview,
    DashboardRedisAnalytics,
    DashboardSummary,
)


@dataclass
class GetDashboardSummaryHandler:
    repository: DashboardRepository
    cache: DashboardSummaryCache | None = None

    async def handle(self, query: DashboardSummaryQuery) -> DashboardSummary:
        if self.cache is not None:
            try:
                cached_summary = self.cache.get(query.club_id)
            except Exception:
                cached_summary = None

            if cached_summary is not None:
                return cached_summary

        summary = self.repository.get_summary(query.club_id)
        if summary is None:
            raise LookupError("Dashboard summary not found.")

        if self.cache is not None:
            try:
                self.cache.set(query.club_id, summary)
            except Exception:
                pass

        return summary


@dataclass
class GetDashboardOverviewHandler:
    repository: DashboardRepository
    cache: DashboardSummaryCache | None = None

    async def handle(self, query: DashboardOverviewQuery) -> DashboardOverview:
        if self.cache is not None:
            try:
                cached_overview = self.cache.get_overview(
                    organization_id=query.organization_id,
                    primary_role=query.primary_role,
                    club_ids=query.club_ids,
                )
            except Exception:
                cached_overview = None

            if cached_overview is not None:
                return cached_overview

        overview = self.repository.get_overview(
            organization_id=query.organization_id,
            primary_role=query.primary_role,
            club_ids=query.club_ids,
        )
        if self.cache is not None:
            try:
                self.cache.set_overview(
                    organization_id=query.organization_id,
                    primary_role=query.primary_role,
                    club_ids=query.club_ids,
                    overview=overview,
                )
            except Exception:
                pass

        return overview


@dataclass
class GetDashboardRedisAnalyticsHandler:
    cache: DashboardSummaryCache | None = None

    async def handle(self, club_id: str) -> DashboardRedisAnalytics:
        if self.cache is None:
            return DashboardRedisAnalytics(
                club_id=club_id,
                cache_key=f"clubcrm:dashboard:summary:{club_id}",
                available=False,
                cache_present=False,
                ttl_seconds=None,
                request_count=0,
                hit_count=0,
                miss_count=0,
                refresh_count=0,
                invalidation_count=0,
                hit_rate=0.0,
                status="unavailable",
                error="Dashboard cache is not configured.",
            )

        try:
            return self.cache.get_analytics(club_id)
        except Exception as exc:
            return DashboardRedisAnalytics(
                club_id=club_id,
                cache_key=f"clubcrm:dashboard:summary:{club_id}",
                available=False,
                cache_present=False,
                ttl_seconds=None,
                request_count=0,
                hit_count=0,
                miss_count=0,
                refresh_count=0,
                invalidation_count=0,
                hit_rate=0.0,
                status="down",
                error=str(exc),
            )
