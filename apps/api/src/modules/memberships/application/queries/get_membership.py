from dataclasses import dataclass

from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership


@dataclass
class GetMembership:
    repository: MembershipRepository

    def execute(self, membership_id: str) -> Membership | None:
        return self.repository.get_membership(membership_id)
