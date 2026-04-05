from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Announcement:
    id: str
    club_id: str
    title: str
    body: str
    published_at: datetime
    created_by: str | None = None
