from abc import ABC, abstractmethod

from src.modules.forms.domain.entities import JoinRequest


class JoinRequestStore(ABC):
    @abstractmethod
    def save(self, join_request: JoinRequest) -> JoinRequest:
        """Persist a raw join request document."""

    @abstractmethod
    def list_pending(self, club_id: str) -> list[JoinRequest]:
        """Return all pending join requests for a club."""

    @abstractmethod
    def get(self, join_request_id: str) -> JoinRequest | None:
        """Return a single join request by id, or None if not found."""

    @abstractmethod
    def update_status(self, join_request_id: str, status: str) -> JoinRequest:
        """Update the status of a join request and return the updated entity."""
