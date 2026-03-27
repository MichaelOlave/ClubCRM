from dataclasses import dataclass

from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


@dataclass
class SubmitJoinRequest:
    store: JoinRequestStore
    publisher: FormSubmissionPublisher | None = None

    def execute(self, join_request: JoinRequest) -> JoinRequest:
        stored_join_request = self.store.save(join_request)

        if self.publisher is not None:
            self.publisher.publish_join_request_submitted(stored_join_request)

        return stored_join_request
