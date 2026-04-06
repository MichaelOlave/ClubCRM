from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Member:
    id: str
    organization_id: str
    first_name: str
    last_name: str
    email: str
    student_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
