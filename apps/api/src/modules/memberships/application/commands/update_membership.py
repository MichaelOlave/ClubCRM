from dataclasses import dataclass

from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership


@dataclass
class UpdateMembership:
    repository: MembershipRepository

    def execute(
        self,
        membership_id: str,
        *,
        role: str | None = None,
        status: str | None = None,
    ) -> Membership | None:
        return self.repository.update_membership(
            membership_id,
            role=role,
            status=status,
        )
