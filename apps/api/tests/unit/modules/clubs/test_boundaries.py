import unittest

from helpers import add_api_root_to_path, collect_import_violations
from src.modules.clubs.application.commands.create_club import CreateClub
from src.modules.clubs.application.commands.delete_club import DeleteClub
from src.modules.clubs.application.commands.update_club import UpdateClub
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.application.queries.get_club import GetClub
from src.modules.clubs.application.queries.list_clubs import ListClubs
from src.modules.clubs.domain.entities import Club

add_api_root_to_path()


class FakeClubRepository(ClubRepository):
    def __init__(self) -> None:
        self.clubs: dict[str, Club] = {
            "club-1": Club(
                id="club-1",
                organization_id="org-1",
                slug="chess-club",
                name="Chess Club",
                description="Strategy and tournaments.",
                status="active",
            )
        }

    def list_clubs(self, organization_id: str | None = None) -> list[Club]:
        return [
            club
            for club in self.clubs.values()
            if organization_id is None or club.organization_id == organization_id
        ]

    def get_club(self, club_id: str) -> Club | None:
        return self.clubs.get(club_id)

    def get_club_by_slug(self, organization_id: str | None, club_slug: str) -> Club | None:
        return next(
            (
                club
                for club in self.clubs.values()
                if club.slug == club_slug
                and (organization_id is None or club.organization_id == organization_id)
            ),
            None,
        )

    def create_club(
        self,
        organization_id: str,
        name: str,
        description: str,
        status: str,
    ) -> Club:
        club = Club(
            id="club-2",
            organization_id=organization_id,
            slug="robotics-club",
            name=name,
            description=description,
            status=status,
        )
        self.clubs[club.id] = club
        return club

    def update_club(
        self,
        club_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
    ) -> Club | None:
        club = self.clubs.get(club_id)
        if club is None:
            return None

        updated_club = Club(
            id=club.id,
            organization_id=club.organization_id,
            slug="robotics-club" if name else club.slug,
            name=name or club.name,
            description=description or club.description,
            status=status or club.status,
        )
        self.clubs[club_id] = updated_club
        return updated_club

    def delete_club(self, club_id: str) -> bool:
        return self.clubs.pop(club_id, None) is not None


class FakeClubSummaryCache(ClubSummaryCache):
    def __init__(self) -> None:
        self.values: dict[str, list[Club]] = {}

    def get(self, organization_id: str) -> list[Club] | None:
        return self.values.get(organization_id)

    def set(self, organization_id: str, clubs: list[Club]) -> None:
        self.values[organization_id] = list(clubs)


class FakeClubEventPublisher(ClubEventPublisher):
    def __init__(self) -> None:
        self.created_club_ids: list[str] = []

    def publish_club_created(self, club: Club) -> None:
        self.created_club_ids.append(club.id)


class ClubBoundaryTests(unittest.TestCase):
    def test_clubs_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/clubs/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_club_use_cases_use_port_contracts(self) -> None:
        repository = FakeClubRepository()
        publisher = FakeClubEventPublisher()
        use_case = ListClubs(
            repository=repository,
            cache=FakeClubSummaryCache(),
        )

        clubs = use_case.execute("org-1")
        created = CreateClub(repository=repository, publisher=publisher).execute(
            organization_id="org-1",
            name="Robotics Club",
            description="Builds competitive robots.",
            status="active",
        )
        fetched = GetClub(repository=repository).execute(created.id)
        updated = UpdateClub(repository=repository).execute(
            created.id,
            description="Builds competitive and community robots.",
        )
        deleted = DeleteClub(repository=repository).execute(created.id)

        self.assertEqual(len(clubs), 1)
        self.assertEqual(clubs[0].name, "Chess Club")
        self.assertIsNotNone(fetched)
        self.assertIsNotNone(updated)
        self.assertTrue(deleted)
        self.assertEqual(publisher.created_club_ids, ["club-2"])
