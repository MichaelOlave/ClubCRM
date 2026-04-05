from dataclasses import asdict

from src.infrastructure.redis.client import RedisClient
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.domain.entities import Club


class RedisClubSummaryCache(ClubSummaryCache):
    TTL_SECONDS = 90

    def __init__(self, client: RedisClient) -> None:
        self.client = client

    def _key(self, organization_id: str) -> str:
        return f"clubcrm:dashboard:summary:{organization_id}"

    def get(self, organization_id: str) -> list[Club] | None:
        data = self.client.get_json(self._key(organization_id))
        if data is None:
            return None
        return [Club(**item) for item in data]

    def set(self, organization_id: str, clubs: list[Club]) -> None:
        payload = [asdict(club) for club in clubs]
        self.client.set_json(
            self._key(organization_id),
            payload,
            ttl_seconds=self.TTL_SECONDS,
        )
