from abc import ABC, abstractmethod

from src.modules.members.domain.entities import Member


class MemberEventPublisher(ABC):
    @abstractmethod
    def publish_member_added(self, member: Member) -> None:
        """Publish a member-added event outside the core write path."""
