from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Event:
    id: str
    club_id: str
    title: str
    description: str
    starts_at: datetime
    location: str | None = None
    ends_at: datetime | None = None
