from dataclasses import dataclass

from src.modules.members.application.ports.member_repository import MemberRepository


@dataclass
class DeleteMember:
    repository: MemberRepository

    def execute(self, member_id: str) -> bool:
        return self.repository.delete_member(member_id)
