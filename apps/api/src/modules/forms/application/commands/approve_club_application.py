from dataclasses import dataclass

from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club
from src.modules.forms.application.ports.club_application_store import ClubApplicationStore
from src.modules.forms.domain.entities import ClubApplication


@dataclass(frozen=True)
class ClubApprovalResult:
    application: ClubApplication
    club: Club
    club_created: bool


@dataclass
class ApproveClubApplication:
    application_store: ClubApplicationStore
    club_repository: ClubRepository

    def execute(self, application_id: str) -> ClubApprovalResult:
        application = self.application_store.get(application_id)
        if application is None:
            raise ValueError(f"Club application {application_id!r} not found.")
        if application.status != "pending":
            raise ValueError(
                f"Club application {application_id!r} has status {application.status!r} "
                "and cannot be approved."
            )

        club = self.club_repository.create_club(
            organization_id=application.organization_id,
            name=application.proposed_club_name,
            description=application.description,
            status="active",
        )

        approved = self.application_store.update_status(application_id, "approved")

        return ClubApprovalResult(
            application=approved,
            club=club,
            club_created=True,
        )
