from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Membership:
    id: str
    club_id: str
    member_id: str
    role: str
    status: str
    joined_at: datetime | None = None
    club_name: str | None = None
    member_name: str | None = None
