from src.infrastructure.kafka.client import KafkaClient
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.domain.entities import JoinRequest


class KafkaFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client
        self.published_events: list[dict[str, str]] = []

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        _ = self.client
        self.published_events.append(
            {
                "topic": "form_submitted",
                "club_id": join_request.club_id,
                "organization_id": join_request.organization_id,
            }
        )
