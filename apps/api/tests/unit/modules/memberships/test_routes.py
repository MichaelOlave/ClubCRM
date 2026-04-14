# ruff: noqa: E402,I001
import unittest
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_audit_log_repository, get_membership_repository
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import require_authorized_access
from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership
from src.modules.memberships.presentation.http.routes import router
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


class FakeMembershipRepository(MembershipRepository):
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self.memberships: dict[str, Membership] = {
            "membership-1": Membership(
                id="membership-1",
                club_id="club-1",
                member_id="member-1",
                role="member",
                status="active",
                joined_at=now,
                club_name="Chess Club",
                member_name="Taylor Student",
            ),
            "membership-9": Membership(
                id="membership-9",
                club_id="club-9",
                member_id="member-9",
                role="captain",
                status="active",
                joined_at=now,
                club_name="Debate Club",
                member_name="Morgan Leader",
            ),
        }

    def list_memberships(
        self,
        club_id: str | None = None,
        member_id: str | None = None,
    ) -> list[Membership]:
        return [
            membership
            for membership in self.memberships.values()
            if (club_id is None or membership.club_id == club_id)
            and (member_id is None or membership.member_id == member_id)
        ]

    def get_membership(self, membership_id: str) -> Membership | None:
        return self.memberships.get(membership_id)

    def create_membership(
        self,
        club_id: str,
        member_id: str,
        role: str,
        status: str,
    ) -> Membership:
        membership_id = f"membership-{len(self.memberships) + 1}"
        membership = Membership(
            id=membership_id,
            club_id=club_id,
            member_id=member_id,
            role=role,
            status=status,
            joined_at=datetime.now(UTC),
            club_name=None,
            member_name=None,
        )
        self.memberships[membership.id] = membership
        return membership

    def update_membership(
        self,
        membership_id: str,
        *,
        role: str | None = None,
        status: str | None = None,
    ) -> Membership | None:
        membership = self.memberships.get(membership_id)
        if membership is None:
            return None

        updated_membership = Membership(
            id=membership.id,
            club_id=membership.club_id,
            member_id=membership.member_id,
            role=role or membership.role,
            status=status or membership.status,
            joined_at=membership.joined_at,
            club_name=membership.club_name,
            member_name=membership.member_name,
        )
        self.memberships[membership_id] = updated_membership
        return updated_membership

    def delete_membership(self, membership_id: str) -> bool:
        return self.memberships.pop(membership_id, None) is not None


class MembershipRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeMembershipRepository()
        self.audit_repository = FakeAuditLogRepository()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_membership_repository] = lambda: self.repository
        self.app.dependency_overrides[get_audit_log_repository] = lambda: self.audit_repository
        self.app.dependency_overrides[get_authenticated_write_context] = (
            lambda: build_authenticated_request_context()
        )
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_membership_routes_support_crud_roundtrip_for_org_admins(self) -> None:
        list_response = self.client.get("/memberships/", params={"club_id": "club-1"})
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        create_response = self.client.post(
            "/memberships/",
            json={
                "club_id": "club-1",
                "member_id": "member-2",
                "role": "secretary",
                "status": "active",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        created_id = create_response.json()["id"]

        read_response = self.client.get(f"/memberships/{created_id}")
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json()["member_id"], "member-2")

        update_response = self.client.patch(
            f"/memberships/{created_id}",
            json={"role": "vice-president"},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["role"], "vice-president")

        delete_response = self.client.delete(f"/memberships/{created_id}")
        self.assertEqual(delete_response.status_code, 204)

        missing_response = self.client.get(f"/memberships/{created_id}")
        self.assertEqual(missing_response.status_code, 404)
        self.assertEqual(len(self.audit_repository.audit_logs), 3)

    def test_club_manager_must_scope_roster_queries_to_a_managed_club(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = (
            lambda: build_club_manager_access("club-1")
        )

        missing_scope_response = self.client.get("/memberships/")
        self.assertEqual(missing_scope_response.status_code, 403)

        scoped_response = self.client.get("/memberships/", params={"club_id": "club-1"})
        self.assertEqual(scoped_response.status_code, 200)
        self.assertEqual(len(scoped_response.json()), 1)

    def test_club_manager_cannot_access_memberships_for_another_club(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = (
            lambda: build_club_manager_access("club-1")
        )

        response = self.client.get("/memberships/membership-9")
        self.assertEqual(response.status_code, 403)

        update_response = self.client.patch(
            "/memberships/membership-9",
            json={"role": "blocked"},
        )
        self.assertEqual(update_response.status_code, 403)
