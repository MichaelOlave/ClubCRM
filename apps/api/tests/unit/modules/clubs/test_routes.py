# ruff: noqa: E402,I001
import unittest
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_authorization_repository,
    get_club_event_publisher,
    get_club_repository,
)
from src.modules.auth.application.ports.authorization_repository import (
    AuthorizationRepository,
    AuthorizationResolution,
    ClubManagerGrant,
)
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import (
    require_authorized_access,
    require_org_admin_access,
)
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club
from src.modules.clubs.presentation.http.routes import router
from src.presentation.http.request_context import get_authenticated_write_context

from tests.audit_fakes import FakeAuditLogRepository, build_authenticated_request_context


def build_org_admin_access() -> AppAccess:
    return AppAccess(
        primary_role="org_admin",
        organization_id="org-1",
        managed_club_ids=(),
    )


def build_club_manager_access(*club_ids: str) -> AppAccess:
    return AppAccess(
        primary_role="club_manager",
        organization_id="org-1",
        managed_club_ids=tuple(club_ids),
    )


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
            ),
            "club-9": Club(
                id="club-9",
                organization_id="org-1",
                slug="debate-club",
                name="Debate Club",
                description="Public speaking and competitions.",
                status="active",
            ),
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
        club_id = f"club-{len(self.clubs) + 1}"
        club = Club(
            id=club_id,
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


class FakeClubEventPublisher(ClubEventPublisher):
    def __init__(self) -> None:
        self.created_club_ids: list[str] = []

    def publish_club_created(self, club: Club) -> None:
        self.created_club_ids.append(club.id)


class FakeAuthorizationRepository(AuthorizationRepository):
    def __init__(self) -> None:
        self.grants_by_club: dict[str, list[ClubManagerGrant]] = {"club-1": []}

    def resolve_access_for_identity(
        self,
        *,
        provider_subject: str,
        email: str | None,
    ) -> AuthorizationResolution:
        _ = (provider_subject, email)
        return AuthorizationResolution(
            admin_user_id="admin-user-1",
            member_id=None,
            access=build_org_admin_access(),
        )

    def list_club_manager_grants(self, club_id: str) -> list[ClubManagerGrant]:
        return list(self.grants_by_club.get(club_id, []))

    def create_club_manager_grant(
        self,
        *,
        club_id: str,
        member_id: str,
        role_name: str,
    ) -> ClubManagerGrant:
        grant = ClubManagerGrant(
            id=f"grant-{len(self.grants_by_club.get(club_id, [])) + 1}",
            club_id=club_id,
            member_id=member_id,
            role_name=role_name,
            assigned_at=datetime.now(UTC),
            member_email=f"{member_id}@example.edu",
            member_name=f"Member {member_id}",
        )
        self.grants_by_club.setdefault(club_id, []).append(grant)
        return grant

    def delete_club_manager_grant(self, *, club_id: str, grant_id: str) -> bool:
        existing_grants = self.grants_by_club.get(club_id, [])
        remaining_grants = [grant for grant in existing_grants if grant.id != grant_id]
        deleted = len(remaining_grants) != len(existing_grants)
        self.grants_by_club[club_id] = remaining_grants
        return deleted


class ClubRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeClubRepository()
        self.repository.clubs["club-2-org-2"] = Club(
            id="club-2-org-2",
            organization_id="org-2",
            slug="chess-club",
            name="Chess Club",
            description="A different organization with the same slug.",
            status="active",
        )
        self.publisher = FakeClubEventPublisher()
        self.audit_repository = FakeAuditLogRepository()
        self.authorization_repository = FakeAuthorizationRepository()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_club_repository] = lambda: self.repository
        self.app.dependency_overrides[get_club_event_publisher] = lambda: self.publisher
        self.app.dependency_overrides[get_audit_log_repository] = lambda: self.audit_repository
        self.app.dependency_overrides[get_authorization_repository] = (
            lambda: self.authorization_repository
        )
        self.app.dependency_overrides[get_authenticated_write_context] = (
            lambda: build_authenticated_request_context()
        )
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access
        self.app.dependency_overrides[require_org_admin_access] = build_org_admin_access
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def set_club_manager_access(self, *club_ids: str) -> None:
        self.app.dependency_overrides[require_authorized_access] = (
            lambda: build_club_manager_access(*club_ids)
        )

        def reject_org_admin_access() -> AppAccess:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization admin access is required for this action.",
            )

        self.app.dependency_overrides[require_org_admin_access] = reject_org_admin_access

    def test_club_routes_support_crud_roundtrip_for_org_admins(self) -> None:
        list_response = self.client.get("/clubs/", params={"organization_id": "org-1"})
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 2)

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
        created = create_response.json()
        self.assertEqual(self.publisher.created_club_ids, [created["id"]])

        read_response = self.client.get(f"/clubs/{created['id']}")
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json()["name"], "Robotics Club")
        self.assertEqual(read_response.json()["slug"], "robotics-club")

        slug_response = self.client.get("/clubs/slug/robotics-club")
        self.assertEqual(slug_response.status_code, 200)
        self.assertEqual(slug_response.json()["id"], created["id"])

    def test_org_admin_slug_lookup_stays_scoped_to_their_organization(self) -> None:
        response = self.client.get("/clubs/slug/chess-club")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "club-1")
        self.assertEqual(payload["organization_id"], "org-1")

        update_response = self.client.patch(
            f"/clubs/{created['id']}",
            json={"description": "Builds robots and hosts workshops."},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(
            update_response.json()["description"],
            "Builds robots and hosts workshops.",
        )

        delete_response = self.client.delete(f"/clubs/{created['id']}")
        self.assertEqual(delete_response.status_code, 204)

        missing_response = self.client.get(f"/clubs/{created['id']}")
        self.assertEqual(missing_response.status_code, 404)
        self.assertEqual(len(self.audit_repository.audit_logs), 3)

    def test_club_manager_only_sees_assigned_clubs_and_cannot_create_clubs(self) -> None:
        self.set_club_manager_access("club-1")

        list_response = self.client.get("/clubs/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([club["id"] for club in list_response.json()], ["club-1"])

        allowed_response = self.client.get("/clubs/club-1")
        self.assertEqual(allowed_response.status_code, 200)

        forbidden_response = self.client.get("/clubs/club-9")
        self.assertEqual(forbidden_response.status_code, 403)

        update_response = self.client.patch("/clubs/club-9", json={"description": "Blocked"})
        self.assertEqual(update_response.status_code, 403)

        create_response = self.client.post(
            "/clubs/",
            json={
                "organization_id": "org-1",
                "name": "Should Fail",
                "description": "Blocked",
                "status": "active",
            },
        )
        self.assertEqual(create_response.status_code, 403)

    def test_org_admin_can_manage_club_manager_grants(self) -> None:
        list_response = self.client.get("/clubs/club-1/manager-grants")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json(), [])

        create_response = self.client.post(
            "/clubs/club-1/manager-grants",
            json={"member_id": "member-7", "role_name": "President"},
        )
        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()
        self.assertEqual(created["member_id"], "member-7")
        self.assertEqual(created["role_name"], "President")

        delete_response = self.client.delete(f"/clubs/club-1/manager-grants/{created['id']}")
        self.assertEqual(delete_response.status_code, 204)

    def test_club_routes_reject_descriptions_longer_than_500_characters(self) -> None:
        too_long_description = "x" * 501

        create_response = self.client.post(
            "/clubs/",
            json={
                "organization_id": "org-1",
                "name": "Robotics Club",
                "description": too_long_description,
                "status": "active",
            },
        )
        self.assertEqual(create_response.status_code, 422)

        update_response = self.client.patch(
            "/clubs/club-1",
            json={"description": too_long_description},
        )
        self.assertEqual(update_response.status_code, 422)
