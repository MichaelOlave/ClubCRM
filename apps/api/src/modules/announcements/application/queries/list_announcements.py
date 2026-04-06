from dataclasses import dataclass

from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementRepository,
)
from src.modules.announcements.domain.entities import Announcement


@dataclass
class ListAnnouncements:
    repository: AnnouncementRepository

    def execute(self, club_id: str) -> list[Announcement]:
        return self.repository.list_announcements(club_id)
