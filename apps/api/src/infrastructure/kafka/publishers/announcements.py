from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.envelope import build_event
from src.modules.announcements.application.ports.announcement_event_publisher import (
    AnnouncementEventPublisher,
)
from src.modules.announcements.domain.entities import Announcement

TOPIC = "clubcrm.announcements.published"


class KafkaAnnouncementEventPublisher(AnnouncementEventPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client

    def publish_announcement_published(self, announcement: Announcement) -> None:
        event = build_event(
            "announcement_published",
            {
                "announcementId": announcement.id,
                "clubId": announcement.club_id,
                "title": announcement.title,
                "publishedAt": (
                    announcement.published_at.isoformat() if announcement.published_at else None
                ),
                "createdBy": announcement.created_by,
            },
        )
        self.client.publish(TOPIC, event)
