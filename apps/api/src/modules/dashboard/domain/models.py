from dataclasses import dataclass


@dataclass(frozen=True)
class DashboardSummary:
    club_id: str
    total_members: int
    total_events: int
    total_announcements: int


@dataclass(frozen=True)
class DashboardRedisAnalytics:
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
