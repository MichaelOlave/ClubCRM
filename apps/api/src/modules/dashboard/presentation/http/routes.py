from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.bootstrap.dependencies import get_dashboard_repository, get_dashboard_summary_cache
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import (
    ensure_club_access,
    require_authorized_access,
)
from src.modules.dashboard.application.handlers import (
    GetDashboardRedisAnalyticsHandler,
    GetDashboardSummaryHandler,
)
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.application.queries import DashboardSummaryQuery
from src.modules.dashboard.domain.models import DashboardRedisAnalytics, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardSummaryResponse(BaseModel):
    club_id: str
    total_members: int
    total_events: int
    total_announcements: int

    @classmethod
    def from_domain(cls, summary: DashboardSummary) -> "DashboardSummaryResponse":
        return cls(
            club_id=summary.club_id,
            total_members=summary.total_members,
            total_events=summary.total_events,
            total_announcements=summary.total_announcements,
        )


class DashboardRedisAnalyticsResponse(BaseModel):
    club_id: str
    cache_key: str
    available: bool
    cache_present: bool
    ttl_seconds: int | None
    request_count: int
    hit_count: int
    miss_count: int
    refresh_count: int
    invalidation_count: int
    hit_rate: float
    status: str
    error: str | None = None

    @classmethod
    def from_domain(
        cls, analytics: DashboardRedisAnalytics
    ) -> "DashboardRedisAnalyticsResponse":
        return cls(
            club_id=analytics.club_id,
            cache_key=analytics.cache_key,
            available=analytics.available,
            cache_present=analytics.cache_present,
            ttl_seconds=analytics.ttl_seconds,
            request_count=analytics.request_count,
            hit_count=analytics.hit_count,
            miss_count=analytics.miss_count,
            refresh_count=analytics.refresh_count,
            invalidation_count=analytics.invalidation_count,
            hit_rate=analytics.hit_rate,
            status=analytics.status,
            error=analytics.error,
        )


@router.get("/summary/{club_id}", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    club_id: str,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[DashboardRepository, Depends(get_dashboard_repository)],
    cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
):
    ensure_club_access(access, club_id)
    handler = GetDashboardSummaryHandler(repository=repository, cache=cache)
    query = DashboardSummaryQuery(club_id=club_id)
    try:
        result = await handler.handle(query)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return DashboardSummaryResponse.from_domain(result)


@router.get("/redis-analytics/{club_id}", response_model=DashboardRedisAnalyticsResponse)
async def get_dashboard_redis_analytics(
    club_id: str,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
):
    ensure_club_access(access, club_id)
    analytics = await GetDashboardRedisAnalyticsHandler(cache=cache).handle(club_id)
    return DashboardRedisAnalyticsResponse.from_domain(analytics)
