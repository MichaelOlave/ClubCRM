from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class CurrentUser:
    sub: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    email_verified: bool = False


@dataclass(frozen=True)
class AppAccess:
    primary_role: Literal["org_admin", "club_manager"]
    organization_id: str
    managed_club_ids: tuple[str, ...]
