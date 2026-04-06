from dataclasses import dataclass

from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.domain.entities import Club


@dataclass
class ListClubs:
    repository: ClubRepository
    cache: ClubSummaryCache | None = None

    def execute(self, organization_id: str | None = None) -> list[Club]:
        if self.cache is not None and organization_id is not None:
            cached_clubs = self.cache.get(organization_id)
            if cached_clubs is not None:
                return cached_clubs

        clubs = self.repository.list_clubs(organization_id)

        if self.cache is not None and organization_id is not None:
            self.cache.set(organization_id, clubs)

        return clubs
