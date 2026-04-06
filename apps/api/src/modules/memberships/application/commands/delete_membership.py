from dataclasses import dataclass

from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)


@dataclass
class DeleteMembership:
    repository: MembershipRepository

    def execute(self, membership_id: str) -> bool:
        return self.repository.delete_membership(membership_id)
