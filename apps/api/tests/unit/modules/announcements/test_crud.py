# ruff: noqa: E402,I001
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_announcement_repository, get_audit_log_repository
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models import tables  # noqa: F401
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.repositories.announcements import (
    PostgresAnnouncementRepository,
)
from src.modules.announcements.presentation.http.routes import router
from src.presentation.http.request_context import get_authenticated_write_context
from tests.audit_fakes import FakeAuditLogRepository, build_authenticated_request_context


def make_repository() -> tuple[
    PostgresAnnouncementRepository,
    tempfile.TemporaryDirectory[str],
]:
    tmp_dir = tempfile.TemporaryDirectory()
    db_path = Path(tmp_dir.name) / "announcements.db"
    client = PostgresClient(dsn=f"sqlite+pysqlite:///{db_path}")
    repository = PostgresAnnouncementRepository(client=client)
    Base.metadata.create_all(repository.client.get_engine())
    return repository, tmp_dir


def build_client(repository: PostgresAnnouncementRepository) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_announcement_repository] = lambda: repository
    app.dependency_overrides[get_audit_log_repository] = lambda: FakeAuditLogRepository()
    app.dependency_overrides[get_authenticated_write_context] = (
        lambda: build_authenticated_request_context()
    )
    return TestClient(app)


class AnnouncementCrudTests(unittest.TestCase):
    def test_repository_supports_crud_roundtrip(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        published_at = datetime(2026, 4, 6, 12, 0, tzinfo=UTC)

        created = repository.create_announcement(
            club_id="club-1",
            title="Welcome",
            body="Hello everyone",
            published_at=published_at,
            created_by="manager@example.edu",
        )
        self.assertEqual(created.club_id, "club-1")

        listed = repository.list_announcements("club-1")
        self.assertEqual(len(listed), 1)
        self.assertEqual(repository.get_announcement(created.id).title, "Welcome")

        updated = repository.update_announcement(created.id, body="Updated body")
        self.assertEqual(updated.body, "Updated body")

        repository.delete_announcement(created.id)
        self.assertEqual(repository.list_announcements("club-1"), [])

    def test_http_routes_support_crud_roundtrip(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        client = build_client(repository)

        created_response = client.post(
            "/announcements",
            json={
                "club_id": "club-1",
                "title": "Welcome",
                "body": "Hello everyone",
                "created_by": "manager@example.edu",
            },
        )
        self.assertEqual(created_response.status_code, 201)
        announcement_id = created_response.json()["id"]

        listed_response = client.get("/announcements", params={"club_id": "club-1"})
        self.assertEqual(listed_response.status_code, 200)
        self.assertEqual(len(listed_response.json()), 1)

        updated_response = client.patch(
            f"/announcements/{announcement_id}",
            json={"body": "Updated body"},
        )
        self.assertEqual(updated_response.status_code, 200)
        self.assertEqual(updated_response.json()["body"], "Updated body")

        delete_response = client.delete(f"/announcements/{announcement_id}")
        self.assertEqual(delete_response.status_code, 204)

        missing_response = client.get(f"/announcements/{announcement_id}")
        self.assertEqual(missing_response.status_code, 404)
