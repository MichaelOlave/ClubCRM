from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

from src.modules.auth.domain.entities import AppAccess


class AuthorizationConflictError(ValueError):
    """Raised when an authorization write conflicts with persisted data."""


@dataclass(frozen=True)
class AuthorizationResolution:
    admin_user_id: str | None
    member_id: str | None
    access: AppAccess | None


@dataclass(frozen=True)
class ClubManagerGrant:
    id: str
    club_id: str
    member_id: str
    role_name: str
    assigned_at: datetime
    member_email: str
    member_name: str


class AuthorizationRepository(ABC):
    @abstractmethod
    def resolve_access_for_identity(
        self,
        *,
        provider_subject: str,
        email: str | None,
    ) -> AuthorizationResolution:
        """Resolve and persist the current user's ClubCRM access binding."""

    @abstractmethod
    def list_club_manager_grants(self, club_id: str) -> list[ClubManagerGrant]:
        """Return manager grants for one club."""

    @abstractmethod
    def create_club_manager_grant(
        self,
        *,
        club_id: str,
        member_id: str,
        role_name: str,
    ) -> ClubManagerGrant:
        """Grant club-manager access to an active club member."""

    @abstractmethod
    def delete_club_manager_grant(self, *, club_id: str, grant_id: str) -> bool:
        """Delete one club-manager grant by identifier."""
