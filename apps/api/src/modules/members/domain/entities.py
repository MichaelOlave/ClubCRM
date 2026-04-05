from dataclasses import dataclass


@dataclass(frozen=True)
class Member:
    id: str
    organization_id: str
    first_name: str
    last_name: str
    email: str
    student_id: str | None = None
