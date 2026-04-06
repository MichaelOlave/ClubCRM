from dataclasses import dataclass

from src.modules.clubs.application.ports.club_repository import ClubRepository


@dataclass
class DeleteClub:
    repository: ClubRepository

    def execute(self, club_id: str) -> bool:
        return self.repository.delete_club(club_id)
