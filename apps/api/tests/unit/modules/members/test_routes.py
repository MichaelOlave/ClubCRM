# ruff: noqa: E402,I001
import unittest
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_member_repository
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import require_org_admin_access
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member
from src.modules.members.presentation.http.routes import router


def build_org_admin_access() -> AppAccess:
    return AppAccess(
        primary_role="org_admin",
        organization_id="org-1",
        managed_club_ids=(),
    )


class FakeMemberRepository(MemberRepository):
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self.members: dict[str, Member] = {
            "member-1": Member(
                id="member-1",
                organization_id="org-1",
                first_name="Taylor",
                last_name="Student",
                email="taylor@example.edu",
                student_id="S001",
                created_at=now,
                updated_at=now,
            )
        }

    def list_members(self, organization_id: str) -> list[Member]:
        return [
            member for member in self.members.values() if member.organization_id == organization_id
        ]

    def get_member(self, member_id: str) -> Member | None:
        return self.members.get(member_id)

    def create_member(self, member: CreateMemberInput) -> Member:
        created = Member(
            id="member-2",
            organization_id=member.organization_id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            student_id=member.student_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.members[created.id] = created
        return created

    def update_member(self, member_id: str, member: UpdateMemberInput) -> Member | None:
        current = self.members.get(member_id)
        if current is None:
            return None

        updated = Member(
            id=current.id,
            organization_id=current.organization_id,
            first_name=member.first_name or current.first_name,
            last_name=member.last_name or current.last_name,
            email=member.email or current.email,
            student_id=member.student_id if member.student_id is not None else current.student_id,
            created_at=current.created_at,
            updated_at=datetime.now(UTC),
        )
        self.members[member_id] = updated
        return updated

    def find_by_email(self, organization_id: str, email: str) -> Member | None:
        return next(
            (
                member
                for member in self.members.values()
                if member.organization_id == organization_id and member.email == email
            ),
            None,
        )

    def delete_member(self, member_id: str) -> bool:
        return self.members.pop(member_id, None) is not None


class MemberRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeMemberRepository()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_member_repository] = lambda: self.repository
        self.app.dependency_overrides[require_org_admin_access] = build_org_admin_access
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_member_routes_are_registered(self) -> None:
        registered_paths = {route.path for route in self.app.router.routes}

        self.assertIn("/members/", registered_paths)
        self.assertIn("/members/{member_id}", registered_paths)

    def test_list_create_read_update_and_delete_member(self) -> None:
        list_response = self.client.get("/members/", params={"organization_id": "org-1"})
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        create_response = self.client.post(
            "/members/",
            json={
                "organization_id": "org-1",
                "first_name": "Morgan",
                "last_name": "Leader",
                "email": "morgan@example.edu",
                "student_id": "S002",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()
        self.assertEqual(created["email"], "morgan@example.edu")

        read_response = self.client.get("/members/member-2")
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json()["first_name"], "Morgan")

        update_response = self.client.patch(
            "/members/member-2",
            json={
                "first_name": "Morgan",
                "last_name": "Manager",
                "email": "morgan@example.edu",
            },
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["last_name"], "Manager")

        delete_response = self.client.delete("/members/member-2")
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(delete_response.content, b"")

    def test_read_member_returns_404_when_missing(self) -> None:
        response = self.client.get("/members/does-not-exist")

        self.assertEqual(response.status_code, 404)

    def test_club_manager_is_rejected_from_member_directory_routes(self) -> None:
        def reject_org_admin_access() -> AppAccess:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization admin access is required for this action.",
            )

        self.app.dependency_overrides[require_org_admin_access] = reject_org_admin_access

        response = self.client.get("/members/", params={"organization_id": "org-1"})

        self.assertEqual(response.status_code, 403)
