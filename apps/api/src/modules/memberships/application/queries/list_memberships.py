from dataclasses import dataclass

from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership


@dataclass
class ListMemberships:
    repository: MembershipRepository

    def execute(
        self,
        club_id: str | None = None,
        member_id: str | None = None,
    ) -> list[Membership]:
        return self.repository.list_memberships(club_id=club_id, member_id=member_id)
