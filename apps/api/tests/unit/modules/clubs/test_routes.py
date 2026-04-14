# ruff: noqa: E402,I001
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_club_event_publisher,
    get_club_repository,
)
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club
from src.modules.clubs.presentation.http.routes import router
from src.presentation.http.request_context import get_authenticated_write_context

from tests.audit_fakes import FakeAuditLogRepository, build_authenticated_request_context


class FakeClubRepository(ClubRepository):
    def __init__(self) -> None:
        self.clubs: dict[str, Club] = {
            "club-1": Club(
                id="club-1",
                organization_id="org-1",
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
            name=name or club.name,
            description=description or club.description,
            status=status or club.status,
        )
        self.clubs[club_id] = updated_club
        return updated_club

    def delete_club(self, club_id: str) -> bool:
        return self.clubs.pop(club_id, None) is not None


class FakeClubEventPublisher(ClubEventPublisher):
    def __init__(self) -> None:
        self.created_club_ids: list[str] = []

    def publish_club_created(self, club: Club) -> None:
        self.created_club_ids.append(club.id)


class ClubRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeClubRepository()
        self.publisher = FakeClubEventPublisher()
        self.audit_repository = FakeAuditLogRepository()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_club_repository] = lambda: self.repository
        self.app.dependency_overrides[get_club_event_publisher] = lambda: self.publisher
        self.app.dependency_overrides[get_audit_log_repository] = lambda: self.audit_repository
        self.app.dependency_overrides[get_authenticated_write_context] = (
            lambda: build_authenticated_request_context()
        )
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_club_routes_support_crud_roundtrip(self) -> None:
        list_response = self.client.get("/clubs/", params={"organization_id": "org-1"})
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        create_response = self.client.post(
            "/clubs/",
            json={
                "organization_id": "org-1",
                "name": "Robotics Club",
                "description": "Builds robots.",
                "status": "active",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(self.publisher.created_club_ids, ["club-2"])

        read_response = self.client.get("/clubs/club-2")
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json()["name"], "Robotics Club")

        update_response = self.client.patch(
            "/clubs/club-2",
            json={"description": "Builds robots and hosts workshops."},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(
            update_response.json()["description"],
            "Builds robots and hosts workshops.",
        )

        delete_response = self.client.delete("/clubs/club-2")
        self.assertEqual(delete_response.status_code, 204)

        missing_response = self.client.get("/clubs/club-2")
        self.assertEqual(missing_response.status_code, 404)
        self.assertEqual(len(self.audit_repository.audit_logs), 3)
