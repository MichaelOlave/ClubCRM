import unittest
from dataclasses import replace
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import (
    get_form_submission_publisher,
    get_join_request_store,
    get_member_repository,
    get_membership_repository,
)
from src.modules.auth.domain.entities import CurrentUser
from src.modules.auth.presentation.http.dependencies import require_authenticated_user, require_csrf
from src.modules.forms.application.ports.form_submission_publisher import FormSubmissionPublisher
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest
from src.modules.forms.presentation.http.routes import router
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member
from src.modules.memberships.application.ports.membership_repository import MembershipRepository
from src.modules.memberships.domain.entities import Membership


class FakeJoinRequestStore(JoinRequestStore):
    def __init__(self, seeded: list[JoinRequest] | None = None) -> None:
        self._data = {join_request.id: join_request for join_request in seeded or []}

    def save(self, join_request: JoinRequest) -> JoinRequest:
        persisted = replace(join_request, id=f"persisted-id-{len(self._data) + 1}")
        self._data[persisted.id] = persisted

        return persisted

    def list_pending(self, club_id: str) -> list[JoinRequest]:
        return [
            join_request
            for join_request in self._data.values()
            if join_request.club_id == club_id and join_request.status == "pending"
        ]

    def get(self, join_request_id: str) -> JoinRequest | None:
        return self._data.get(join_request_id)

    def update_status(self, join_request_id: str, status: str) -> JoinRequest:
        join_request = self._data.get(join_request_id)
        if join_request is None:
            raise ValueError(f"Join request {join_request_id!r} not found.")

        updated = replace(join_request, status=status)
        self._data[join_request_id] = updated
        return updated


class FakeMemberRepository(MemberRepository):
    def __init__(self, existing: list[Member] | None = None) -> None:
        self._members = {member.id: member for member in existing or []}

    def list_members(self, organization_id: str) -> list[Member]:
        return [
            member for member in self._members.values() if member.organization_id == organization_id
        ]

    def get_member(self, member_id: str) -> Member | None:
        return self._members.get(member_id)

    def create_member(self, member: CreateMemberInput) -> Member:
        created = Member(
            id=f"member-{len(self._members) + 1}",
            organization_id=member.organization_id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            student_id=member.student_id,
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 1),
        )
        self._members[created.id] = created
        return created

    def update_member(self, member_id: str, member: UpdateMemberInput) -> Member | None:
        existing = self._members.get(member_id)
        if existing is None:
            return None

        updated = replace(
            existing,
            first_name=member.first_name if member.first_name is not None else existing.first_name,
            last_name=member.last_name if member.last_name is not None else existing.last_name,
            email=member.email if member.email is not None else existing.email,
            student_id=member.student_id if member.student_id is not None else existing.student_id,
        )
        self._members[member_id] = updated
        return updated

    def find_by_email(self, organization_id: str, email: str) -> Member | None:
        return next(
            (
                member
                for member in self._members.values()
                if member.organization_id == organization_id and member.email == email
            ),
            None,
        )

    def delete_member(self, member_id: str) -> bool:
        return self._members.pop(member_id, None) is not None


class FakeMembershipRepository(MembershipRepository):
    def __init__(self, existing: list[Membership] | None = None) -> None:
        self._memberships = {membership.id: membership for membership in existing or []}

    def list_memberships(
        self,
        club_id: str | None = None,
        member_id: str | None = None,
    ) -> list[Membership]:
        return [
            membership
            for membership in self._memberships.values()
            if (club_id is None or membership.club_id == club_id)
            and (member_id is None or membership.member_id == member_id)
        ]

    def get_membership(self, membership_id: str) -> Membership | None:
        return self._memberships.get(membership_id)

    def create_membership(
        self,
        club_id: str,
        member_id: str,
        role: str,
        status: str,
    ) -> Membership:
        created = Membership(
            id=f"membership-{len(self._memberships) + 1}",
            club_id=club_id,
            member_id=member_id,
            role=role,
            status=status,
            joined_at=datetime(2024, 1, 1),
        )
        self._memberships[created.id] = created
        return created

    def update_membership(
        self,
        membership_id: str,
        *,
        role: str | None = None,
        status: str | None = None,
    ) -> Membership | None:
        existing = self._memberships.get(membership_id)
        if existing is None:
            return None

        updated = replace(
            existing,
            role=role if role is not None else existing.role,
            status=status if status is not None else existing.status,
        )
        self._memberships[membership_id] = updated
        return updated

    def delete_membership(self, membership_id: str) -> bool:
        return self._memberships.pop(membership_id, None) is not None


class FakeFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self) -> None:
        self.was_called = False

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        _ = join_request
        self.was_called = True


class JoinRequestRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = FakeJoinRequestStore()
        self.publisher = FakeFormSubmissionPublisher()
        self.members = FakeMemberRepository()
        self.memberships = FakeMembershipRepository()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store
        self.app.dependency_overrides[get_form_submission_publisher] = lambda: self.publisher
        self.app.dependency_overrides[get_member_repository] = lambda: self.members
        self.app.dependency_overrides[get_membership_repository] = lambda: self.memberships
        self.app.dependency_overrides[require_authenticated_user] = lambda: CurrentUser(
            sub="user-1",
            email="manager@example.edu",
        )
        self.app.dependency_overrides[require_csrf] = lambda: None
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_valid_submission_returns_201_with_id_and_status(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["id"], "persisted-id-1")
        self.assertEqual(body["status"], "pending")

    def test_valid_submission_calls_publisher(self) -> None:
        self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertTrue(self.publisher.was_called)

    def test_optional_message_included_in_payload(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
                "message": "I love chess.",
            },
        )

        self.assertEqual(response.status_code, 201)

    def test_optional_form_fields_round_trip_through_response(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
                "student_id": "S12345",
                "role": "Leadership interest",
                "message": "I love chess.",
            },
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["student_id"], "S12345")
        self.assertEqual(body["role"], "Leadership interest")
        self.assertEqual(body["message"], "I love chess.")

    def test_invalid_email_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "not-an-email",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_missing_required_field_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_club_id_comes_from_path(self) -> None:
        captured: list[JoinRequest] = []

        class CapturingStore(JoinRequestStore):
            def save(self, join_request: JoinRequest) -> JoinRequest:
                from dataclasses import replace

                captured.append(join_request)
                return replace(join_request, id="captured-id")

            def list_pending(self, club_id: str) -> list[JoinRequest]:
                return []

            def get(self, join_request_id: str) -> JoinRequest | None:
                return None

            def update_status(self, join_request_id: str, status: str) -> JoinRequest:
                raise NotImplementedError

        self.app.dependency_overrides[get_join_request_store] = lambda: CapturingStore()
        self.client.post(
            "/forms/join-request/club-99",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(len(captured), 1)
        self.assertEqual(captured[0].club_id, "club-99")

    def test_list_pending_join_requests_returns_form_fields(self) -> None:
        self.store = FakeJoinRequestStore(
            seeded=[
                JoinRequest(
                    id="join-1",
                    organization_id="org-1",
                    club_id="club-1",
                    submitter_name="Taylor Student",
                    submitter_email="taylor@example.edu",
                    payload={
                        "student_id": "S12345",
                        "role": "Leadership interest",
                        "message": "I love chess.",
                    },
                )
            ]
        )
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store

        response = self.client.get("/forms/join-requests/club-1/pending")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["student_id"], "S12345")
        self.assertEqual(body[0]["role"], "Leadership interest")
        self.assertEqual(body[0]["message"], "I love chess.")

    def test_list_pending_join_requests_requires_authentication(self) -> None:
        self.app.dependency_overrides.pop(require_authenticated_user, None)

        response = self.client.get("/forms/join-requests/club-1/pending")

        self.assertEqual(response.status_code, 401)

    def test_approve_join_request_creates_member_and_membership(self) -> None:
        self.store = FakeJoinRequestStore(
            seeded=[
                JoinRequest(
                    id="join-1",
                    organization_id="org-1",
                    club_id="club-1",
                    submitter_name="Taylor Student",
                    submitter_email="taylor@example.edu",
                    payload={"student_id": "S12345"},
                )
            ]
        )
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store

        response = self.client.post("/forms/join-requests/join-1/approve", json={"role": "member"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "approved")
        self.assertTrue(body["member_created"])
        self.assertTrue(body["membership_created"])

        created_member = self.members.get_member(body["member_id"])
        self.assertIsNotNone(created_member)
        self.assertEqual(created_member.student_id if created_member is not None else None, "S12345")

    def test_deny_join_request_marks_request_denied(self) -> None:
        self.store = FakeJoinRequestStore(
            seeded=[
                JoinRequest(
                    id="join-1",
                    organization_id="org-1",
                    club_id="club-1",
                    submitter_name="Taylor Student",
                    submitter_email="taylor@example.edu",
                )
            ]
        )
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store

        response = self.client.post("/forms/join-requests/join-1/deny")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "denied")
