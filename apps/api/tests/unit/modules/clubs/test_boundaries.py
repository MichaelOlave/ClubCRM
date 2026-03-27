import unittest

from helpers import add_api_root_to_path, collect_import_violations
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.application.queries.list_clubs import ListClubs
from src.modules.clubs.domain.entities import Club

add_api_root_to_path()


class FakeClubRepository(ClubRepository):
    def list_clubs(self, organization_id: str) -> list[Club]:
        return [
            Club(
                id="club-1",
                organization_id=organization_id,
                name="Chess Club",
                description="Strategy and tournaments.",
                status="active",
            )
        ]


class FakeClubSummaryCache(ClubSummaryCache):
    def __init__(self) -> None:
        self.values: dict[str, list[Club]] = {}

    def get(self, organization_id: str) -> list[Club] | None:
        return self.values.get(organization_id)

    def set(self, organization_id: str, clubs: list[Club]) -> None:
        self.values[organization_id] = list(clubs)


class ClubBoundaryTests(unittest.TestCase):
    def test_clubs_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/clubs/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_list_clubs_uses_port_contracts(self) -> None:
        use_case = ListClubs(
            repository=FakeClubRepository(),
            cache=FakeClubSummaryCache(),
        )

        clubs = use_case.execute("org-1")

        self.assertEqual(len(clubs), 1)
        self.assertEqual(clubs[0].name, "Chess Club")
