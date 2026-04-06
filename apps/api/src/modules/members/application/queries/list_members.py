from dataclasses import dataclass

from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member


@dataclass
class ListMembers:
    repository: MemberRepository

    def execute(self, organization_id: str) -> list[Member]:
        return self.repository.list_members(organization_id)
