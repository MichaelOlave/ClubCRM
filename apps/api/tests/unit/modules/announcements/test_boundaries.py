import unittest
from datetime import UTC, datetime

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.announcements.application.commands.create_announcement import (
    CreateAnnouncement,
)
from src.modules.announcements.application.commands.delete_announcement import (
    DeleteAnnouncement,
)
from src.modules.announcements.application.commands.update_announcement import (
    UpdateAnnouncement,
)
from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementRepository,
)
from src.modules.announcements.application.queries.get_announcement import (
    GetAnnouncement,
)
from src.modules.announcements.application.queries.list_announcements import (
    ListAnnouncements,
)
from src.modules.announcements.domain.entities import Announcement


class FakeAnnouncementRepository(AnnouncementRepository):
    def __init__(self) -> None:
        self.announcements: dict[str, Announcement] = {}

    def list_announcements(self, club_id: str) -> list[Announcement]:
        return [
            announcement
            for announcement in self.announcements.values()
            if announcement.club_id == club_id
        ]

    def get_announcement(self, announcement_id: str) -> Announcement:
        return self.announcements[announcement_id]

    def create_announcement(
        self,
        *,
        club_id: str,
        title: str,
        body: str,
        published_at=None,
        created_by: str | None = None,
    ) -> Announcement:
        announcement = Announcement(
            id="announcement-1",
            club_id=club_id,
            title=title,
            body=body,
            published_at=published_at,
            created_by=created_by,
        )
        self.announcements[announcement.id] = announcement
        return announcement

    def update_announcement(
        self,
        announcement_id: str,
        *,
        title: str | None = None,
        body: str | None = None,
        published_at=None,
        created_by: str | None = None,
    ) -> Announcement:
        current = self.announcements[announcement_id]
        updated = Announcement(
            id=current.id,
            club_id=current.club_id,
            title=title or current.title,
            body=body or current.body,
            published_at=published_at or current.published_at,
            created_by=created_by if created_by is not None else current.created_by,
        )
        self.announcements[announcement_id] = updated
        return updated

    def delete_announcement(self, announcement_id: str) -> None:
        self.announcements.pop(announcement_id, None)


class AnnouncementBoundaryTests(unittest.TestCase):
    def test_announcements_application_avoids_framework_and_infrastructure_imports(
        self,
    ) -> None:
        violations = collect_import_violations(
            "modules/announcements/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_announcement_use_cases_delegate_to_the_repository_port(self) -> None:
        repository = FakeAnnouncementRepository()
        created = CreateAnnouncement(repository=repository).execute(
            club_id="club-1",
            title="Welcome",
            body="Hello everyone",
            published_at=datetime(2026, 4, 6, 12, 0, tzinfo=UTC),
        )

        self.assertEqual(created.title, "Welcome")
        self.assertEqual(
            ListAnnouncements(repository=repository).execute("club-1")[0].id,
            "announcement-1",
        )

        updated = UpdateAnnouncement(repository=repository).execute(
            "announcement-1",
            title="Updated Welcome",
        )
        self.assertEqual(updated.title, "Updated Welcome")
        self.assertEqual(
            GetAnnouncement(repository=repository).execute("announcement-1").title,
            "Updated Welcome",
        )

        DeleteAnnouncement(repository=repository).execute("announcement-1")
        self.assertEqual(ListAnnouncements(repository=repository).execute("club-1"), [])
