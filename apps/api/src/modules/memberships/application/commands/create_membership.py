from dataclasses import dataclass

from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership


@dataclass
class CreateMembership:
    repository: MembershipRepository

    def execute(
        self,
        club_id: str,
        member_id: str,
        role: str = "member",
        status: str = "active",
    ) -> Membership:
        return self.repository.create_membership(
            club_id=club_id,
            member_id=member_id,
            role=role,
            status=status,
        )
