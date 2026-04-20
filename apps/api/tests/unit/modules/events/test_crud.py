# ruff: noqa: E402,I001
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_audit_log_repository, get_event_repository
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models import tables  # noqa: F401
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.repositories.events import PostgresEventRepository
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import require_authorized_access
from src.modules.events.presentation.http.routes import router
from src.presentation.http.request_context import get_authenticated_write_context
from tests.audit_fakes import FakeAuditLogRepository, build_authenticated_request_context


def build_org_admin_access() -> AppAccess:
    return AppAccess(
        primary_role="org_admin",
        organization_id="org-1",
        managed_club_ids=(),
    )


def make_repository() -> tuple[PostgresEventRepository, tempfile.TemporaryDirectory[str]]:
    tmp_dir = tempfile.TemporaryDirectory()
    db_path = Path(tmp_dir.name) / "events.db"
    client = PostgresClient(dsn=f"sqlite+pysqlite:///{db_path}")
    repository = PostgresEventRepository(client=client)
    Base.metadata.create_all(repository.client.get_engine())
    return repository, tmp_dir


def build_client(repository: PostgresEventRepository) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_event_repository] = lambda: repository
    app.dependency_overrides[get_audit_log_repository] = lambda: FakeAuditLogRepository()
    app.dependency_overrides[get_authenticated_write_context] = (
        lambda: build_authenticated_request_context()
    )
    app.dependency_overrides[require_authorized_access] = build_org_admin_access
    return TestClient(app)


class EventCrudTests(unittest.TestCase):
    def test_repository_supports_crud_roundtrip(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        starts_at = datetime(2026, 4, 10, 18, 0, tzinfo=UTC)
        ends_at = datetime(2026, 4, 10, 20, 0, tzinfo=UTC)

        created = repository.create_event(
            club_id="club-1",
            title="Kickoff",
            description="Opening meeting",
            starts_at=starts_at,
            location="Student Center",
            ends_at=ends_at,
        )
        self.assertEqual(created.club_id, "club-1")

        listed = repository.list_events("club-1")
        self.assertEqual(len(listed), 1)
        self.assertEqual(repository.get_event(created.id).title, "Kickoff")

        updated = repository.update_event(
            created.id,
            title="Kickoff Night",
            location=None,
            ends_at=None,
        )
        self.assertEqual(updated.title, "Kickoff Night")
        self.assertIsNone(updated.location)
        self.assertIsNone(updated.ends_at)

        repository.delete_event(created.id)
        self.assertEqual(repository.list_events("club-1"), [])

    def test_http_routes_support_crud_roundtrip(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        client = build_client(repository)
        starts_at = "2026-04-10T18:00:00Z"
        ends_at = "2026-04-10T20:00:00Z"

        created_response = client.post(
            "/events",
            json={
                "club_id": "club-1",
                "title": "Kickoff",
                "description": "Opening meeting",
                "starts_at": starts_at,
                "location": "Student Center",
                "ends_at": ends_at,
            },
        )
        self.assertEqual(created_response.status_code, 201)
        event_id = created_response.json()["id"]

        listed_response = client.get("/events", params={"club_id": "club-1"})
        self.assertEqual(listed_response.status_code, 200)
        self.assertEqual(len(listed_response.json()), 1)

        updated_response = client.patch(
            f"/events/{event_id}",
            json={"title": "Kickoff Night", "location": None, "ends_at": None},
        )
        self.assertEqual(updated_response.status_code, 200)
        self.assertEqual(updated_response.json()["title"], "Kickoff Night")
        self.assertIsNone(updated_response.json()["location"])
        self.assertIsNone(updated_response.json()["ends_at"])

        delete_response = client.delete(f"/events/{event_id}")
        self.assertEqual(delete_response.status_code, 204)

        missing_response = client.get(f"/events/{event_id}")
        self.assertEqual(missing_response.status_code, 404)

    def test_http_routes_reject_invalid_event_schedule(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        client = build_client(repository)

        invalid_create_response = client.post(
            "/events",
            json={
                "club_id": "club-1",
                "title": "Kickoff",
                "description": "Opening meeting",
                "starts_at": "2026-04-10T18:00:00Z",
                "ends_at": "2026-04-10T17:30:00Z",
            },
        )
        self.assertEqual(invalid_create_response.status_code, 422)
        self.assertEqual(
            invalid_create_response.json()["detail"],
            "Event end time must be after the start time.",
        )

        created_response = client.post(
            "/events",
            json={
                "club_id": "club-1",
                "title": "Kickoff",
                "description": "Opening meeting",
                "starts_at": "2026-04-10T18:00:00Z",
                "ends_at": "2026-04-10T20:00:00Z",
            },
        )
        event_id = created_response.json()["id"]

        invalid_update_response = client.patch(
            f"/events/{event_id}",
            json={"ends_at": "2026-04-10T17:30:00Z"},
        )
        self.assertEqual(invalid_update_response.status_code, 422)
        self.assertEqual(
            invalid_update_response.json()["detail"],
            "Event end time must be after the start time.",
        )

    def test_http_routes_reject_descriptions_longer_than_500_characters(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        client = build_client(repository)
        too_long_description = "x" * 501

        invalid_create_response = client.post(
            "/events",
            json={
                "club_id": "club-1",
                "title": "Kickoff",
                "description": too_long_description,
                "starts_at": "2026-04-10T18:00:00Z",
            },
        )
        self.assertEqual(invalid_create_response.status_code, 422)

        created_response = client.post(
            "/events",
            json={
                "club_id": "club-1",
                "title": "Kickoff",
                "description": "Opening meeting",
                "starts_at": "2026-04-10T18:00:00Z",
            },
        )
        event_id = created_response.json()["id"]

        invalid_update_response = client.patch(
            f"/events/{event_id}",
            json={"description": too_long_description},
        )
        self.assertEqual(invalid_update_response.status_code, 422)
