import unittest
from dataclasses import replace

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club
from src.modules.forms.application.commands.approve_club_application import (
    ApproveClubApplication,
)
from src.modules.forms.application.commands.submit_club_application import SubmitClubApplication
from src.modules.forms.application.ports.club_application_store import ClubApplicationStore
from src.modules.forms.domain.entities import ClubApplication


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


def _make_application(**kwargs) -> ClubApplication:
    defaults = dict(
        id="app-1",
        organization_id="org-1",
        applicant_name="Taylor Student",
        applicant_email="taylor@example.edu",
        proposed_club_name="Chess Club",
        description="A club for chess enthusiasts.",
        status="pending",
    )
    defaults.update(kwargs)
    return ClubApplication(**defaults)


class FakeClubApplicationStore(ClubApplicationStore):
    def __init__(self, application: ClubApplication | None = None) -> None:
        self._data: dict[str, ClubApplication] = {}
        if application:
            self._data[application.id] = application

    def save(self, application: ClubApplication) -> ClubApplication:
        saved = replace(application, id="new-app-1")
        self._data[saved.id] = saved
        return saved

    def list_pending(self, organization_id: str) -> list[ClubApplication]:
        return [
            a
            for a in self._data.values()
            if a.status == "pending" and a.organization_id == organization_id
        ]

    def get(self, application_id: str) -> ClubApplication | None:
        return self._data.get(application_id)

    def update_status(self, application_id: str, status: str) -> ClubApplication:
        updated = replace(self._data[application_id], status=status)
        self._data[application_id] = updated
        return updated


class FakeClubRepository(ClubRepository):
    def __init__(self) -> None:
        self._clubs: dict[str, Club] = {}

    def list_clubs(self, organization_id: str | None = None) -> list[Club]:
        return list(self._clubs.values())

    def get_club(self, club_id: str) -> Club | None:
        return self._clubs.get(club_id)

    def create_club(
        self, organization_id: str, name: str, description: str, status: str
    ) -> Club:
        club = Club(
            id=f"club-{len(self._clubs) + 1}",
            organization_id=organization_id,
            name=name,
            description=description,
            status=status,
        )
        self._clubs[club.id] = club
        return club

    def update_club(self, club_id, *, name=None, description=None, status=None):
        return self._clubs.get(club_id)

    def delete_club(self, club_id: str) -> bool:
        return self._clubs.pop(club_id, None) is not None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class SubmitClubApplicationTests(unittest.TestCase):
    def test_submit_persists_and_returns_application(self):
        store = FakeClubApplicationStore()
        application = ClubApplication(
            organization_id="org-1",
            applicant_name="Taylor Student",
            applicant_email="taylor@example.edu",
            proposed_club_name="Chess Club",
            description="A club for chess enthusiasts.",
        )

        result = SubmitClubApplication(store=store).execute(application)

        self.assertEqual(result.id, "new-app-1")
        self.assertEqual(result.proposed_club_name, "Chess Club")
        self.assertEqual(result.status, "pending")


class ApproveClubApplicationTests(unittest.TestCase):
    def _command(self, application: ClubApplication | None = None):
        app = application or _make_application()
        return ApproveClubApplication(
            application_store=FakeClubApplicationStore(app),
            club_repository=FakeClubRepository(),
        )

    def test_success_creates_club_and_marks_approved(self):
        result = self._command().execute("app-1")

        self.assertEqual(result.application.status, "approved")
        self.assertEqual(result.club.name, "Chess Club")
        self.assertEqual(result.club.organization_id, "org-1")
        self.assertEqual(result.club.status, "active")
        self.assertTrue(result.club_created)

    def test_raises_when_application_not_found(self):
        command = ApproveClubApplication(
            application_store=FakeClubApplicationStore(),
            club_repository=FakeClubRepository(),
        )

        with self.assertRaises(ValueError, msg="not found"):
            command.execute("nonexistent")

    def test_raises_when_already_approved(self):
        already_approved = _make_application(status="approved")

        with self.assertRaises(ValueError, msg="cannot be approved"):
            self._command(already_approved).execute("app-1")

    def test_created_club_uses_proposed_name_and_description(self):
        application = _make_application(
            proposed_club_name="Robotics Club",
            description="Building robots together.",
        )

        result = self._command(application).execute("app-1")

        self.assertEqual(result.club.name, "Robotics Club")
        self.assertEqual(result.club.description, "Building robots together.")
