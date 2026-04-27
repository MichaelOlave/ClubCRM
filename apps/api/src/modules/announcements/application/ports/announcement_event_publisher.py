from abc import ABC, abstractmethod

from src.modules.announcements.domain.entities import Announcement


class AnnouncementEventPublisher(ABC):
    @abstractmethod
    def publish_announcement_published(self, announcement: Announcement) -> None:
        """Publish an announcement-published event outside the core write path."""
