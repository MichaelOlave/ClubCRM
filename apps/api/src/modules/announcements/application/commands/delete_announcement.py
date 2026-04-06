from dataclasses import dataclass

from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementRepository,
)


@dataclass
class DeleteAnnouncement:
    repository: AnnouncementRepository

    def execute(self, announcement_id: str) -> None:
        self.repository.delete_announcement(announcement_id)
