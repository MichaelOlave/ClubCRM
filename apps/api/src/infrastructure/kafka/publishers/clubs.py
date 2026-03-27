from src.infrastructure.kafka.client import KafkaClient
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.domain.entities import Club


class KafkaClubEventPublisher(ClubEventPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client
        self.published_events: list[dict[str, str]] = []

    def publish_club_created(self, club: Club) -> None:
        _ = self.client
        self.published_events.append(
            {
                "topic": "club_created",
                "club_id": club.id,
                "organization_id": club.organization_id,
            }
        )
