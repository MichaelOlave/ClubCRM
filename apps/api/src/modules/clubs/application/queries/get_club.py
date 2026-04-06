from dataclasses import dataclass

from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club


@dataclass
class GetClub:
    repository: ClubRepository

    def execute(self, club_id: str) -> Club | None:
        return self.repository.get_club(club_id)
