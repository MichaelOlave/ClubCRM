from dataclasses import dataclass

from src.modules.members.application.models import CreateMemberInput
from src.modules.members.application.ports.member_event_publisher import (
    MemberEventPublisher,
)
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member


@dataclass
class CreateMember:
    repository: MemberRepository
    publisher: MemberEventPublisher | None = None

    def execute(self, member: CreateMemberInput) -> Member:
        created = self.repository.create_member(member)

        if self.publisher is not None:
            self.publisher.publish_member_added(created)

        return created
