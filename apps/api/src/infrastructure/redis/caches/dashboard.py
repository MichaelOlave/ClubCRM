from dataclasses import asdict

from src.infrastructure.redis.client import RedisClient
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.domain.models import DashboardRedisAnalytics, DashboardSummary


class RedisDashboardSummaryCache(DashboardSummaryCache):
    TTL_SECONDS = 90

    def __init__(self, client: RedisClient) -> None:
        self.client = client

    def _summary_key(self, club_id: str) -> str:
        return f"clubcrm:dashboard:summary:{club_id}"

    def _metric_key(self, club_id: str, metric: str) -> str:
        return f"clubcrm:dashboard:summary:{club_id}:{metric}"

    def get(self, club_id: str) -> DashboardSummary | None:
        self.client.increment(self._metric_key(club_id, "requests"))
        data = self.client.get_json(self._summary_key(club_id))
        if data is None:
            self.client.increment(self._metric_key(club_id, "misses"))
            return None

        self.client.increment(self._metric_key(club_id, "hits"))
        return DashboardSummary(**data)

    def set(self, club_id: str, summary: DashboardSummary) -> None:
        self.client.set_json(
            self._summary_key(club_id),
            asdict(summary),
            ttl_seconds=self.TTL_SECONDS,
        )
        self.client.increment(self._metric_key(club_id, "refreshes"))

    def delete(self, club_id: str) -> None:
        self.client.delete(self._summary_key(club_id))
        self.client.increment(self._metric_key(club_id, "invalidations"))

    def get_analytics(self, club_id: str) -> DashboardRedisAnalytics:
        ttl_seconds = self.client.ttl(self._summary_key(club_id))
        cache_present = ttl_seconds >= 0 or ttl_seconds == -1
        normalized_ttl = ttl_seconds if ttl_seconds >= 0 else None

        request_count = self.client.get_int(self._metric_key(club_id, "requests"))
        hit_count = self.client.get_int(self._metric_key(club_id, "hits"))
        miss_count = self.client.get_int(self._metric_key(club_id, "misses"))
        refresh_count = self.client.get_int(self._metric_key(club_id, "refreshes"))
        invalidation_count = self.client.get_int(self._metric_key(club_id, "invalidations"))
        hit_rate = hit_count / request_count if request_count else 0.0

        return DashboardRedisAnalytics(
            club_id=club_id,
            cache_key=self._summary_key(club_id),
            available=True,
            cache_present=cache_present,
            ttl_seconds=normalized_ttl,
            request_count=request_count,
            hit_count=hit_count,
            miss_count=miss_count,
            refresh_count=refresh_count,
            invalidation_count=invalidation_count,
            hit_rate=hit_rate,
            status="warm" if cache_present else "cold",
            error=None,
        )
