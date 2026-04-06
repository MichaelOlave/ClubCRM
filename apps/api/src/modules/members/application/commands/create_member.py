from dataclasses import dataclass

from src.modules.members.application.models import CreateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member


@dataclass
class CreateMember:
    repository: MemberRepository

    def execute(self, member: CreateMemberInput) -> Member:
        return self.repository.create_member(member)
