from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class JoinRequest:
    organization_id: str
    club_id: str
    submitter_name: str
    submitter_email: str
    payload: dict[str, Any] = field(default_factory=dict)
    id: str | None = None
    status: str = "pending"


@dataclass(frozen=True)
class ClubApplication:
    organization_id: str
    applicant_name: str
    applicant_email: str
    proposed_club_name: str
    description: str
    payload: dict[str, Any] = field(default_factory=dict)
    id: str | None = None
    status: str = "pending"
