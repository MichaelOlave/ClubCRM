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
    GetDashboardOverviewHandler,
    GetDashboardRedisAnalyticsHandler,
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

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardOverviewScopeResponse(BaseModel):
    organization_id: str
    primary_role: str
    club_ids: list[str]

    @classmethod
    def from_domain(cls, scope: DashboardOverviewScope) -> "DashboardOverviewScopeResponse":
        return cls(
            organization_id=scope.organization_id,
            primary_role=scope.primary_role,
            club_ids=list(scope.club_ids),
        )


class DashboardOverviewMetricsResponse(BaseModel):
    accessible_club_count: int
    active_club_count: int
    unique_member_count: int
    pending_membership_count: int
    upcoming_event_count: int
    announcement_count: int
    multi_club_member_count: int

    @classmethod
    def from_domain(cls, metrics: DashboardOverviewMetrics) -> "DashboardOverviewMetricsResponse":
        return cls(
            accessible_club_count=metrics.accessible_club_count,
            active_club_count=metrics.active_club_count,
            unique_member_count=metrics.unique_member_count,
            pending_membership_count=metrics.pending_membership_count,
            upcoming_event_count=metrics.upcoming_event_count,
            announcement_count=metrics.announcement_count,
            multi_club_member_count=metrics.multi_club_member_count,
        )


class DashboardOverviewClubSummaryResponse(BaseModel):
    id: str
    organization_id: str
    slug: str
    name: str
    description: str
    status: str
    member_count: int
    manager_name: str | None
    next_event_at: str | None

    @classmethod
    def from_domain(
        cls, club: DashboardOverviewClubSummary
    ) -> "DashboardOverviewClubSummaryResponse":
        return cls(
            id=club.id,
            organization_id=club.organization_id,
            slug=club.slug,
            name=club.name,
            description=club.description,
            status=club.status,
            member_count=club.member_count,
            manager_name=club.manager_name,
            next_event_at=club.next_event_at,
        )


class DashboardOverviewActivityResponse(BaseModel):
    id: str
    club_id: str
    club_slug: str
    club_name: str
    type: str
    title: str
    description: str
    timestamp: str

    @classmethod
    def from_domain(
        cls, activity: DashboardOverviewActivity
    ) -> "DashboardOverviewActivityResponse":
        return cls(
            id=activity.id,
            club_id=activity.club_id,
            club_slug=activity.club_slug,
            club_name=activity.club_name,
            type=activity.type,
            title=activity.title,
            description=activity.description,
            timestamp=activity.timestamp,
        )


class DashboardOverviewResponse(BaseModel):
    scope: DashboardOverviewScopeResponse
    metrics: DashboardOverviewMetricsResponse
    clubs: list[DashboardOverviewClubSummaryResponse]
    recent_activity: list[DashboardOverviewActivityResponse]

    @classmethod
    def from_domain(cls, overview: DashboardOverview) -> "DashboardOverviewResponse":
        return cls(
            scope=DashboardOverviewScopeResponse.from_domain(overview.scope),
            metrics=DashboardOverviewMetricsResponse.from_domain(overview.metrics),
            clubs=[
                DashboardOverviewClubSummaryResponse.from_domain(club) for club in overview.clubs
            ],
            recent_activity=[
                DashboardOverviewActivityResponse.from_domain(activity)
                for activity in overview.recent_activity
            ],
        )


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
    def from_domain(cls, analytics: DashboardRedisAnalytics) -> "DashboardRedisAnalyticsResponse":
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


@router.get("/summary", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[DashboardRepository, Depends(get_dashboard_repository)],
    cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
):
    query = DashboardOverviewQuery(
        organization_id=access.organization_id,
        primary_role=access.primary_role,
        club_ids=(
            tuple(sorted(access.managed_club_ids))
            if access.primary_role == "club_manager"
            else ()
        ),
    )
    overview = await GetDashboardOverviewHandler(repository=repository, cache=cache).handle(query)
    return DashboardOverviewResponse.from_domain(overview)


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
