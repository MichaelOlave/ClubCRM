from abc import ABC, abstractmethod

from src.modules.forms.domain.entities import ClubApplication


class ClubApplicationStore(ABC):
    @abstractmethod
    def save(self, application: ClubApplication) -> ClubApplication:
        """Persist a raw club application document."""

    @abstractmethod
    def list_pending(self, organization_id: str) -> list[ClubApplication]:
        """Return all pending club applications for an organization."""

    @abstractmethod
    def get(self, application_id: str) -> ClubApplication | None:
        """Return a single club application by id, or None if not found."""

    @abstractmethod
    def update_status(self, application_id: str, status: str) -> ClubApplication:
        """Update the status of a club application and return the updated entity."""
