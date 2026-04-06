from abc import ABC, abstractmethod

from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.domain.entities import Member


class MemberRepository(ABC):
    @abstractmethod
    def list_members(self, organization_id: str) -> list[Member]:
        """Return members for a single organization."""

    @abstractmethod
    def get_member(self, member_id: str) -> Member | None:
        """Return a single member if it exists."""

    @abstractmethod
    def create_member(self, member: CreateMemberInput) -> Member:
        """Persist a new member."""

    @abstractmethod
    def update_member(self, member_id: str, member: UpdateMemberInput) -> Member | None:
        """Update an existing member."""

    @abstractmethod
    def delete_member(self, member_id: str) -> bool:
        """Delete a member and report whether a row was removed."""
