from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.envelope import build_event
from src.modules.events.application.ports.event_event_publisher import (
    EventEventPublisher,
)
from src.modules.events.domain.entities import Event

TOPIC = "clubcrm.events.created"


class KafkaEventEventPublisher(EventEventPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client

    def publish_event_created(self, event: Event) -> None:
        envelope = build_event(
            "event_created",
            {
                "eventId": event.id,
                "clubId": event.club_id,
                "title": event.title,
                "startsAt": event.starts_at.isoformat() if event.starts_at else None,
                "endsAt": event.ends_at.isoformat() if event.ends_at else None,
                "location": event.location,
            },
        )
        self.client.publish(TOPIC, envelope)
