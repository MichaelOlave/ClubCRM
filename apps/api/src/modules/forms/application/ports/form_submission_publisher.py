from abc import ABC, abstractmethod

from src.modules.forms.domain.entities import JoinRequest


class FormSubmissionPublisher(ABC):
    @abstractmethod
    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        """Publish a join request submission event."""
