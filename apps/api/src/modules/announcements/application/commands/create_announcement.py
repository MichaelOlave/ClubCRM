from dataclasses import dataclass
from datetime import datetime

from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementRepository,
)
from src.modules.announcements.domain.entities import Announcement


@dataclass
class CreateAnnouncement:
    repository: AnnouncementRepository

    def execute(
        self,
        *,
        club_id: str,
        title: str,
        body: str,
        published_at: datetime | None = None,
        created_by: str | None = None,
    ) -> Announcement:
        return self.repository.create_announcement(
            club_id=club_id,
            title=title,
            body=body,
            published_at=published_at,
            created_by=created_by,
        )
