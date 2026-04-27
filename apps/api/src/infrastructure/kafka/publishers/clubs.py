from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.envelope import build_event
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.domain.entities import Club

TOPIC = "clubcrm.clubs.created"


class KafkaClubEventPublisher(ClubEventPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client

    def publish_club_created(self, club: Club) -> None:
        event = build_event(
            "club_created",
            {
                "clubId": club.id,
                "organizationId": club.organization_id,
                "slug": club.slug,
                "name": club.name,
                "status": club.status,
            },
        )
        self.client.publish(TOPIC, event)
