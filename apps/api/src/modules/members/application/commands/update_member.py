from dataclasses import dataclass

from src.modules.members.application.models import UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member


@dataclass
class UpdateMember:
    repository: MemberRepository

    def execute(self, member_id: str, member: UpdateMemberInput) -> Member | None:
        return self.repository.update_member(member_id, member)
