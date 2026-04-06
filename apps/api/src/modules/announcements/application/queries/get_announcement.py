from dataclasses import dataclass

from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementRepository,
)
from src.modules.announcements.domain.entities import Announcement


@dataclass
class GetAnnouncement:
    repository: AnnouncementRepository

    def execute(self, announcement_id: str) -> Announcement:
        return self.repository.get_announcement(announcement_id)
