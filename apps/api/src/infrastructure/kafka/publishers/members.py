from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.envelope import build_event
from src.modules.members.application.ports.member_event_publisher import (
    MemberEventPublisher,
)
from src.modules.members.domain.entities import Member

TOPIC = "clubcrm.members.added"


class KafkaMemberEventPublisher(MemberEventPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client

    def publish_member_added(self, member: Member) -> None:
        event = build_event(
            "member_added",
            {
                "memberId": member.id,
                "organizationId": member.organization_id,
                "email": member.email,
                "firstName": member.first_name,
                "lastName": member.last_name,
                "studentId": member.student_id,
            },
        )
        self.client.publish(TOPIC, event)
