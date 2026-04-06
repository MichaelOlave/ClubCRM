from dataclasses import dataclass

from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club


@dataclass
class CreateClub:
    repository: ClubRepository
    publisher: ClubEventPublisher | None = None

    def execute(
        self,
        organization_id: str,
        name: str,
        description: str = "",
        status: str = "active",
    ) -> Club:
        club = self.repository.create_club(
            organization_id=organization_id,
            name=name,
            description=description,
            status=status,
        )

        if self.publisher is not None:
            self.publisher.publish_club_created(club)

        return club
