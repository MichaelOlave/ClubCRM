import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_event_repository
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.models import tables  # noqa: F401
from src.infrastructure.postgres.repositories.events import PostgresEventRepository
from src.modules.events.presentation.http.routes import router


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
    return TestClient(app)


class EventCrudTests(unittest.TestCase):
    def test_repository_supports_crud_roundtrip(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        starts_at = datetime(2026, 4, 10, 18, 0, tzinfo=UTC)

        created = repository.create_event(
            club_id="club-1",
            title="Kickoff",
            description="Opening meeting",
            starts_at=starts_at,
        )
        self.assertEqual(created.club_id, "club-1")

        listed = repository.list_events("club-1")
        self.assertEqual(len(listed), 1)
        self.assertEqual(repository.get_event(created.id).title, "Kickoff")

        updated = repository.update_event(created.id, title="Kickoff Night")
        self.assertEqual(updated.title, "Kickoff Night")

        repository.delete_event(created.id)
        self.assertEqual(repository.list_events("club-1"), [])

    def test_http_routes_support_crud_roundtrip(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)
        client = build_client(repository)
        starts_at = "2026-04-10T18:00:00Z"

        created_response = client.post(
            "/events",
            json={
                "club_id": "club-1",
                "title": "Kickoff",
                "description": "Opening meeting",
                "starts_at": starts_at,
            },
        )
        self.assertEqual(created_response.status_code, 201)
        event_id = created_response.json()["id"]

        listed_response = client.get("/events", params={"club_id": "club-1"})
        self.assertEqual(listed_response.status_code, 200)
        self.assertEqual(len(listed_response.json()), 1)

        updated_response = client.patch(
            f"/events/{event_id}",
            json={"title": "Kickoff Night"},
        )
        self.assertEqual(updated_response.status_code, 200)
        self.assertEqual(updated_response.json()["title"], "Kickoff Night")

        delete_response = client.delete(f"/events/{event_id}")
        self.assertEqual(delete_response.status_code, 204)

        missing_response = client.get(f"/events/{event_id}")
        self.assertEqual(missing_response.status_code, 404)
