# ruff: noqa: E402,I001
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models import tables  # noqa: F401
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.models.tables import (
    AnnouncementModel,
    ClubManagerRoleModel,
    ClubModel,
    EventModel,
    MemberModel,
    MembershipModel,
    OrganizationModel,
)
from src.infrastructure.postgres.repositories.dashboard import PostgresDashboardRepository


def make_repository() -> tuple[PostgresDashboardRepository, tempfile.TemporaryDirectory[str]]:
    tmp_dir = tempfile.TemporaryDirectory()
    db_path = Path(tmp_dir.name) / "dashboard.db"
    client = PostgresClient(dsn=f"sqlite+pysqlite:///{db_path}")
    repository = PostgresDashboardRepository(client=client)
    Base.metadata.create_all(repository.client.get_engine())
    return repository, tmp_dir


def seed_overview_data(repository: PostgresDashboardRepository) -> None:
    with repository.client.create_session() as session:
        session.add(OrganizationModel(id="org-1", name="ClubCRM"))
        session.add_all(
            [
                ClubModel(
                    id="club-1",
                    organization_id="org-1",
                    slug="chess-club",
                    name="Chess Club",
                    description="Strategy and tournaments.",
                    status="active",
                ),
                ClubModel(
                    id="club-2",
                    organization_id="org-1",
                    slug="robotics-club",
                    name="Robotics Club",
                    description="Builds and competitions.",
                    status="planning",
                ),
            ]
        )
        session.add_all(
            [
                MemberModel(
                    id="member-1",
                    organization_id="org-1",
                    first_name="Alex",
                    last_name="Smith",
                    email="alex@example.com",
                ),
                MemberModel(
                    id="member-2",
                    organization_id="org-1",
                    first_name="Brooke",
                    last_name="Lee",
                    email="brooke@example.com",
                ),
                MemberModel(
                    id="member-3",
                    organization_id="org-1",
                    first_name="Casey",
                    last_name="Jones",
                    email="casey@example.com",
                ),
            ]
        )
        session.add_all(
            [
                MembershipModel(
                    id="membership-1",
                    club_id="club-1",
                    member_id="member-1",
                    role="president",
                    status="active",
                    joined_at=datetime(2026, 1, 10, 18, 0, tzinfo=UTC),
                ),
                MembershipModel(
                    id="membership-2",
                    club_id="club-1",
                    member_id="member-2",
                    role="member",
                    status="pending",
                    joined_at=datetime(2026, 1, 11, 18, 0, tzinfo=UTC),
                ),
                MembershipModel(
                    id="membership-3",
                    club_id="club-2",
                    member_id="member-1",
                    role="mentor",
                    status="active",
                    joined_at=datetime(2026, 1, 12, 18, 0, tzinfo=UTC),
                ),
                MembershipModel(
                    id="membership-4",
                    club_id="club-2",
                    member_id="member-3",
                    role="member",
                    status="active",
                    joined_at=datetime(2026, 1, 13, 18, 0, tzinfo=UTC),
                ),
            ]
        )
        session.add(
            ClubManagerRoleModel(
                id="grant-1",
                club_id="club-1",
                member_id="member-1",
                role_name="club_manager",
                assigned_at=datetime(2026, 1, 15, 18, 0, tzinfo=UTC),
            )
        )
        session.add_all(
            [
                EventModel(
                    id="event-1",
                    club_id="club-1",
                    title="Spring Open",
                    description="Annual tournament",
                    location="Student Center",
                    starts_at=datetime(2036, 5, 1, 18, 0, tzinfo=UTC),
                    ends_at=datetime(2036, 5, 1, 20, 0, tzinfo=UTC),
                ),
                EventModel(
                    id="event-2",
                    club_id="club-2",
                    title="Build Night",
                    description="Prepare robots",
                    location=None,
                    starts_at=datetime(2036, 5, 3, 18, 0, tzinfo=UTC),
                    ends_at=None,
                ),
                EventModel(
                    id="event-3",
                    club_id="club-2",
                    title="Retrospective",
                    description="Look back on the last competition season.",
                    location=None,
                    starts_at=datetime(2020, 4, 20, 18, 0, tzinfo=UTC),
                    ends_at=None,
                ),
            ]
        )
        session.add_all(
            [
                AnnouncementModel(
                    id="announcement-1",
                    club_id="club-1",
                    title="Pairings posted",
                    body="See the club portal for pairings and room assignments.",
                    published_at=datetime(2036, 4, 29, 12, 0, tzinfo=UTC),
                    created_by="Alex Smith",
                ),
                AnnouncementModel(
                    id="announcement-2",
                    club_id="club-2",
                    title="Competition prep",
                    body="Bring your hardware kits and batteries for inspection.",
                    published_at=datetime(2036, 4, 30, 12, 0, tzinfo=UTC),
                    created_by="Casey Jones",
                ),
            ]
        )
        session.commit()


class DashboardRepositoryTests(unittest.TestCase):
    def test_get_overview_returns_access_scoped_metrics_and_recent_activity(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        seed_overview_data(repository)

        overview = repository.get_overview(
            organization_id="org-1",
            primary_role="org_admin",
            club_ids=(),
        )

        self.assertEqual(overview.metrics.accessible_club_count, 2)
        self.assertEqual(overview.metrics.active_club_count, 1)
        self.assertEqual(overview.metrics.unique_member_count, 3)
        self.assertEqual(overview.metrics.pending_membership_count, 1)
        self.assertEqual(overview.metrics.upcoming_event_count, 2)
        self.assertEqual(overview.metrics.announcement_count, 2)
        self.assertEqual(overview.metrics.multi_club_member_count, 1)
        self.assertEqual(overview.clubs[0].manager_name, "Alex Smith")
        self.assertIsNotNone(overview.clubs[0].next_event_at)
        self.assertEqual(len(overview.recent_activity), 5)
        timestamps = [activity.timestamp for activity in overview.recent_activity]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_get_overview_scopes_to_managed_clubs(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        seed_overview_data(repository)

        overview = repository.get_overview(
            organization_id="org-1",
            primary_role="club_manager",
            club_ids=("club-2",),
        )

        self.assertEqual(overview.scope.club_ids, ("club-2",))
        self.assertEqual(overview.metrics.accessible_club_count, 1)
        self.assertEqual(overview.metrics.unique_member_count, 2)
        self.assertEqual(overview.metrics.pending_membership_count, 0)
        self.assertEqual(overview.metrics.multi_club_member_count, 0)
        self.assertEqual([club.id for club in overview.clubs], ["club-2"])
        self.assertTrue(all(activity.club_id == "club-2" for activity in overview.recent_activity))

    def test_get_overview_returns_empty_payload_when_no_clubs_are_accessible(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        with repository.client.create_session() as session:
            session.add(OrganizationModel(id="org-1", name="ClubCRM"))
            session.commit()

        overview = repository.get_overview(
            organization_id="org-1",
            primary_role="club_manager",
            club_ids=(),
        )

        self.assertEqual(overview.metrics.accessible_club_count, 0)
        self.assertEqual(overview.metrics.unique_member_count, 0)
        self.assertEqual(overview.clubs, ())
        self.assertEqual(overview.recent_activity, ())
