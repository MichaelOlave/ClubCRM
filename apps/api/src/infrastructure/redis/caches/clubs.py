from src.infrastructure.redis.client import RedisClient
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.domain.entities import Club


class RedisClubSummaryCache(ClubSummaryCache):
    def __init__(self, client: RedisClient) -> None:
        self.client = client
        self._cache: dict[str, list[Club]] = {}

    def get(self, organization_id: str) -> list[Club] | None:
        _ = self.client
        return self._cache.get(organization_id)

    def set(self, organization_id: str, clubs: list[Club]) -> None:
        _ = self.client
        self._cache[organization_id] = list(clubs)
