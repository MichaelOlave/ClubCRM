from abc import ABC, abstractmethod

from src.modules.memberships.domain.entities import Membership


class MembershipConflictError(ValueError):
    """Raised when a membership write conflicts with relational constraints."""


class MembershipRepository(ABC):
    @abstractmethod
    def list_memberships(
        self,
        club_id: str | None = None,
        member_id: str | None = None,
    ) -> list[Membership]:
        """Return memberships, optionally filtered by club or member."""

    @abstractmethod
    def get_membership(self, membership_id: str) -> Membership | None:
        """Return one membership when it exists."""

    @abstractmethod
    def create_membership(
        self,
        club_id: str,
        member_id: str,
        role: str,
        status: str,
    ) -> Membership:
        """Create a membership record."""

    @abstractmethod
    def update_membership(
        self,
        membership_id: str,
        *,
        role: str | None = None,
        status: str | None = None,
    ) -> Membership | None:
        """Update a membership record when it exists."""

    @abstractmethod
    def delete_membership(self, membership_id: str) -> bool:
        """Delete a membership when it exists."""
