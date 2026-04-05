from dataclasses import dataclass


@dataclass(frozen=True)
class Membership:
    id: str
    club_id: str
    member_id: str
    role: str
    status: str
