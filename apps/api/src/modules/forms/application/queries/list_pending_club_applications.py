from dataclasses import dataclass

from src.modules.forms.application.ports.club_application_store import ClubApplicationStore
from src.modules.forms.domain.entities import ClubApplication


@dataclass
class ListPendingClubApplications:
    store: ClubApplicationStore

    def execute(self, organization_id: str) -> list[ClubApplication]:
        return self.store.list_pending(organization_id)
