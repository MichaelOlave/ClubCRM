from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.envelope import build_event
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.domain.entities import JoinRequest

TOPIC = "clubcrm.forms.submitted"


class KafkaFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        event = build_event(
            "form_submitted",
            {
                "joinRequestId": join_request.id,
                "clubId": join_request.club_id,
                "organizationId": join_request.organization_id,
                "submitter": {
                    "name": join_request.submitter_name,
                    "email": join_request.submitter_email,
                },
                "status": join_request.status,
            },
        )
        self.client.publish(TOPIC, event)
