from dataclasses import dataclass
from datetime import datetime

from src.modules.announcements.application.ports.announcement_repository import (
    UNSET,
    AnnouncementRepository,
)
from src.modules.announcements.domain.entities import Announcement


@dataclass
class UpdateAnnouncement:
    repository: AnnouncementRepository

    def execute(
        self,
        announcement_id: str,
        *,
        title: str | None = None,
        body: str | None = None,
        published_at: datetime | None = None,
        created_by: str | None | object = UNSET,
    ) -> Announcement:
        return self.repository.update_announcement(
            announcement_id,
            title=title,
            body=body,
            published_at=published_at,
            created_by=created_by,
        )
