from dataclasses import dataclass

from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club


@dataclass
class UpdateClub:
    repository: ClubRepository

    def execute(
        self,
        club_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
    ) -> Club | None:
        return self.repository.update_club(
            club_id,
            name=name,
            description=description,
            status=status,
        )
