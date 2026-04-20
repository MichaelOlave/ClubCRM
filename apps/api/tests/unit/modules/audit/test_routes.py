# ruff: noqa: E402,I001
import unittest
from datetime import UTC, datetime
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_club_event_publisher,
    get_club_repository,
)
from src.modules.audit.presentation.http.routes import router as audit_router
from src.modules.auth.application.ports.auth_session_store import (
    AuthSessionRecord,
    AuthSessionStore,
)
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club
from src.modules.clubs.presentation.http.routes import router as clubs_router
from tests.audit_fakes import FakeAuditLogRepository, build_audit_log


class InMemoryAuthSessionStore(AuthSessionStore):
    def __init__(self) -> None:
        self.records: dict[str, AuthSessionRecord] = {}

    def create(self, record: AuthSessionRecord) -> str:
        session_id = f"session-{len(self.records) + 1}"
        self.records[session_id] = record
        return session_id

    def get(self, session_id: str) -> AuthSessionRecord | None:
        return self.records.get(session_id)

    def save(self, session_id: str, record: AuthSessionRecord) -> None:
        self.records[session_id] = record

    def delete(self, session_id: str) -> None:
        self.records.pop(session_id, None)

    def touch(self, session_id: str) -> None:
        _ = session_id


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
        return list(self.clubs.values())

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
            id=f"club-{len(self.clubs) + 1}",
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

        updated = Club(
            id=club.id,
            organization_id=club.organization_id,
            slug="robotics-club" if name else club.slug,
            name=name or club.name,
            description=description or club.description,
            status=status or club.status,
        )
        self.clubs[club.id] = updated
        return updated

    def delete_club(self, club_id: str) -> bool:
        return self.clubs.pop(club_id, None) is not None


class FakeClubEventPublisher(ClubEventPublisher):
    def publish_club_created(self, club: Club) -> None:
        _ = club


class AuditRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = InMemoryAuthSessionStore()
        self.audit_repository = FakeAuditLogRepository()
        self.club_repository = FakeClubRepository()
        self.app = FastAPI()
        self.app.include_router(clubs_router)
        self.app.include_router(audit_router)
        self.app.dependency_overrides[get_club_repository] = lambda: self.club_repository
        self.app.dependency_overrides[get_club_event_publisher] = lambda: FakeClubEventPublisher()
        self.app.dependency_overrides[get_audit_log_repository] = lambda: self.audit_repository
        self.auth_store_patcher = patch(
            "src.modules.auth.presentation.http.dependencies.get_auth_session_store",
            return_value=self.store,
        )
        self.auth_store_patcher.start()
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.auth_store_patcher.stop()
        self.app.dependency_overrides.clear()

    def _create_authenticated_session(self, *, csrf_token: str | None = "csrf-token") -> str:
        return self.store.create(
            AuthSessionRecord(
                user={
                    "sub": "auth0|manager-1",
                    "email": "manager@example.edu",
                    "name": "Morgan Manager",
                    "email_verified": True,
                },
                csrf_token=csrf_token,
                auth_flow_state=None,
                created_at=datetime.now(UTC).isoformat(),
            )
        )

    def test_admin_write_returns_401_without_authentication(self) -> None:
        response = self.client.post(
            "/clubs/",
            json={
                "organization_id": "org-1",
                "name": "Robotics Club",
                "description": "Builds robots.",
                "status": "active",
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_admin_write_returns_403_when_csrf_is_missing(self) -> None:
        session_id = self._create_authenticated_session()
        self.client.cookies.set("clubcrm_session", session_id)

        response = self.client.post(
            "/clubs/",
            json={
                "organization_id": "org-1",
                "name": "Robotics Club",
                "description": "Builds robots.",
                "status": "active",
            },
        )

        self.assertEqual(response.status_code, 403)

    def test_successful_write_records_one_audit_row(self) -> None:
        session_id = self._create_authenticated_session()
        self.client.cookies.set("clubcrm_session", session_id)
        self.client.cookies.set("clubcrm_csrf", "csrf-token")

        response = self.client.post(
            "/clubs/",
            headers={"X-CSRF-Token": "csrf-token", "X-ClubCRM-Origin-Path": "/clubs"},
            json={
                "organization_id": "org-1",
                "name": "Robotics Club",
                "description": "Builds robots.",
                "status": "active",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(self.audit_repository.audit_logs), 1)
        self.assertEqual(self.audit_repository.audit_logs[0].resource_label, "Robotics Club")

    def test_delete_audit_log_keeps_readable_target_label(self) -> None:
        session_id = self._create_authenticated_session()
        self.client.cookies.set("clubcrm_session", session_id)
        self.client.cookies.set("clubcrm_csrf", "csrf-token")

        response = self.client.delete(
            "/clubs/club-1",
            headers={"X-CSRF-Token": "csrf-token", "X-ClubCRM-Origin-Path": "/clubs/club-1"},
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.audit_repository.audit_logs[-1].resource_label, "Chess Club")

    def test_audit_log_route_requires_authentication(self) -> None:
        response = self.client.get("/audit-logs")

        self.assertEqual(response.status_code, 401)

    def test_audit_log_route_respects_filters(self) -> None:
        session_id = self._create_authenticated_session()
        self.client.cookies.set("clubcrm_session", session_id)
        self.audit_repository.audit_logs = [
            build_audit_log(
                audit_id="audit-1",
                occurred_at=datetime(2026, 4, 14, 9, 0, tzinfo=UTC),
                action="create",
                resource_type="club",
                resource_id="club-1",
            ),
            build_audit_log(
                audit_id="audit-2",
                occurred_at=datetime(2026, 4, 14, 10, 0, tzinfo=UTC),
                action="update",
                resource_type="member",
                resource_id="member-1",
                resource_label="Morgan Manager",
            ),
        ]

        response = self.client.get(
            "/audit-logs",
            params={"resource_type": "member", "action": "update"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["items"]), 1)
        self.assertEqual(body["items"][0]["resource"]["type"], "member")
        self.assertEqual(body["items"][0]["action"], "update")
        self.assertEqual(body["pagination"]["page"], 1)
        self.assertFalse(body["pagination"]["has_next"])

    def test_audit_log_route_supports_pagination(self) -> None:
        session_id = self._create_authenticated_session()
        self.client.cookies.set("clubcrm_session", session_id)
        self.audit_repository.audit_logs = [
            build_audit_log(
                audit_id="audit-1",
                occurred_at=datetime(2026, 4, 14, 9, 0, tzinfo=UTC),
            ),
            build_audit_log(
                audit_id="audit-2",
                occurred_at=datetime(2026, 4, 14, 10, 0, tzinfo=UTC),
            ),
            build_audit_log(
                audit_id="audit-3",
                occurred_at=datetime(2026, 4, 14, 11, 0, tzinfo=UTC),
            ),
        ]

        response = self.client.get("/audit-logs", params={"limit": 2, "page": 2})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual([item["id"] for item in body["items"]], ["audit-1"])
        self.assertEqual(body["pagination"]["page"], 2)
        self.assertFalse(body["pagination"]["has_next"])
        self.assertTrue(body["pagination"]["has_previous"])
