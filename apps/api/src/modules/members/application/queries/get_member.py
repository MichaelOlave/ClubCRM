from dataclasses import dataclass

from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member


@dataclass
class GetMember:
    repository: MemberRepository

    def execute(self, member_id: str) -> Member | None:
        return self.repository.get_member(member_id)
