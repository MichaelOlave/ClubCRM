from dataclasses import dataclass

from src.modules.forms.application.ports.club_application_store import ClubApplicationStore
from src.modules.forms.domain.entities import ClubApplication


@dataclass
class SubmitClubApplication:
    store: ClubApplicationStore

    def execute(self, application: ClubApplication) -> ClubApplication:
        return self.store.save(application)
