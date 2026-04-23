# ruff: noqa: E402,I001
import unittest
from dataclasses import replace
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_club_repository,
    get_form_submission_publisher,
    get_join_request_store,
    get_member_repository,
    get_membership_repository,
    get_redis_client,
)
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import require_authorized_access
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club
from src.modules.forms.application.ports.form_submission_publisher import FormSubmissionPublisher
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest
from src.modules.forms.presentation.http.limits import TEXT_LIMITS
from src.modules.forms.presentation.http.routes import router
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member
from src.modules.memberships.application.ports.membership_repository import (
    MembershipConflictError,
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership
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


class FakeClubRepository(ClubRepository):
    def __init__(self, clubs: list[Club] | None = None) -> None:
        self._clubs = {club.id: club for club in clubs or []}

    def list_clubs(self, organization_id: str | None = None) -> list[Club]:
        return [
            club
            for club in self._clubs.values()
            if organization_id is None or club.organization_id == organization_id
        ]

    def get_club(self, club_id: str) -> Club | None:
        return self._clubs.get(club_id)

    def get_club_by_slug(self, organization_id: str | None, club_slug: str) -> Club | None:
        return next(
            (
                club
                for club in self._clubs.values()
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
        created = Club(
            id=f"club-{len(self._clubs) + 1}",
            organization_id=organization_id,
            slug="new-club",
            name=name,
            description=description,
            status=status,
        )
        self._clubs[created.id] = created
        return created

    def update_club(
        self,
        club_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
    ) -> Club | None:
        existing = self._clubs.get(club_id)
        if existing is None:
            return None

        updated = replace(
            existing,
            name=name if name is not None else existing.name,
            description=description if description is not None else existing.description,
            status=status if status is not None else existing.status,
        )
        self._clubs[club_id] = updated
        return updated

    def delete_club(self, club_id: str) -> bool:
        return self._clubs.pop(club_id, None) is not None


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


class ConflictMembershipRepository(FakeMembershipRepository):
    def create_membership(
        self,
        club_id: str,
        member_id: str,
        role: str,
        status: str,
    ) -> Membership:
        raise MembershipConflictError("duplicate")


class FakeFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self) -> None:
        self.was_called = False

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        _ = join_request
        self.was_called = True


class FakeRedisClient:
    def __init__(self) -> None:
        self._counts: dict[str, int] = {}
        self._ttls: dict[str, int] = {}

    def increment(self, key: str, amount: int = 1) -> int:
        current = self._counts.get(key, 0) + amount
        self._counts[key] = current
        return current

    def expire(self, key: str, ttl_seconds: int) -> bool:
        self._ttls[key] = ttl_seconds
        return True

    def ttl(self, key: str) -> int:
        return self._ttls.get(key, -1)


class FailingRedisClient:
    def increment(self, key: str, amount: int = 1) -> int:
        _ = (key, amount)
        raise RuntimeError("redis unavailable")

    def expire(self, key: str, ttl_seconds: int) -> bool:
        _ = (key, ttl_seconds)
        raise AssertionError("expire should not be called after increment fails")

    def ttl(self, key: str) -> int:
        _ = key
        raise AssertionError("ttl should not be called after increment fails")


class JoinRequestRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = FakeJoinRequestStore()
        self.publisher = FakeFormSubmissionPublisher()
        self.redis_client = FakeRedisClient()
        self.clubs = FakeClubRepository(
            clubs=[
                Club(
                    id="club-1",
                    organization_id="org-1",
                    slug="chess-club",
                    name="Chess Club",
                    description="Board games and matches.",
                    status="active",
                ),
                Club(
                    id="club-99",
                    organization_id="org-99",
                    slug="robotics-club",
                    name="Robotics Club",
                    description="Build and compete.",
                    status="active",
                ),
            ]
        )
        self.members = FakeMemberRepository()
        self.memberships = FakeMembershipRepository()
        self.audit_repository = FakeAuditLogRepository()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store
        self.app.dependency_overrides[get_form_submission_publisher] = lambda: self.publisher
        self.app.dependency_overrides[get_club_repository] = lambda: self.clubs
        self.app.dependency_overrides[get_member_repository] = lambda: self.members
        self.app.dependency_overrides[get_membership_repository] = lambda: self.memberships
        self.app.dependency_overrides[get_redis_client] = lambda: self.redis_client
        self.app.dependency_overrides[get_audit_log_repository] = lambda: self.audit_repository
        self.app.dependency_overrides[get_authenticated_write_context] = (
            lambda: build_authenticated_request_context()
        )
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_valid_submission_returns_201_with_id_and_status(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["id"], "persisted-id-1")
        self.assertEqual(body["status"], "pending")

    def test_public_join_request_context_is_available_without_authentication(self) -> None:
        self.app.dependency_overrides.pop(require_authorized_access, None)

        response = self.client.get("/forms/join-request-context/chess-club")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "club_id": "club-1",
                "club_name": "Chess Club",
                "club_description": "Board games and matches.",
            },
        )

    def test_public_join_request_context_supports_club_id_lookup(self) -> None:
        response = self.client.get("/forms/join-request-context/club-99")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "club_id": "club-99",
                "club_name": "Robotics Club",
                "club_description": "Build and compete.",
            },
        )

    def test_public_join_request_context_returns_404_for_unknown_club(self) -> None:
        response = self.client.get("/forms/join-request-context/missing-club")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Club not found"})

    def test_valid_submission_calls_publisher(self) -> None:
        self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertTrue(self.publisher.was_called)

    def test_optional_message_included_in_payload(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
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
                "submitter_name": "Taylor Student",
                "submitter_email": "not-an-email",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_missing_required_field_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_submitter_name_over_text_limit_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_name": "T" * (TEXT_LIMITS["member_name"] + 1),
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_message_over_text_limit_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
                "message": "x" * (TEXT_LIMITS["join_request_message"] + 1),
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_public_join_request_rate_limit_returns_429_after_threshold(self) -> None:
        for _ in range(5):
            response = self.client.post(
                "/forms/join-request/club-1",
                json={
                    "submitter_name": "Taylor Student",
                    "submitter_email": "taylor@example.edu",
                },
            )
            self.assertEqual(response.status_code, 201)

        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(
            response.json(),
            {
                "detail": "Too many join requests from this source. Please try again later.",
            },
        )
        self.assertEqual(response.headers.get("retry-after"), "300")

    def test_public_join_request_rate_limit_fails_open_when_redis_is_unavailable(self) -> None:
        self.app.dependency_overrides[get_redis_client] = lambda: FailingRedisClient()

        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 201)

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
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(len(captured), 1)
        self.assertEqual(captured[0].club_id, "club-99")
        self.assertEqual(captured[0].organization_id, "org-99")

    def test_unknown_club_returns_404(self) -> None:
        response = self.client.post(
            "/forms/join-request/missing-club",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Club not found"})

    def test_submission_uses_club_organization_id_instead_of_client_input(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-99",
            json={
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
                "organization_id": "org-1",
            },
        )

        self.assertEqual(response.status_code, 201)

        stored = self.store.get("persisted-id-1")
        self.assertIsNotNone(stored)
        self.assertEqual(stored.organization_id if stored is not None else None, "org-99")

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
        self.app.dependency_overrides.pop(require_authorized_access, None)

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
        self.assertEqual(
            created_member.student_id if created_member is not None else None, "S12345"
        )
        self.assertEqual(len(self.audit_repository.audit_logs), 1)

    def test_approve_join_request_returns_409_when_membership_creation_has_no_fallback(self) -> None:
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
        self.members = FakeMemberRepository(
            existing=[
                Member(
                    id="member-1",
                    organization_id="org-1",
                    first_name="Taylor",
                    last_name="Student",
                    email="taylor@example.edu",
                    student_id=None,
                    created_at=datetime(2024, 1, 1),
                    updated_at=datetime(2024, 1, 1),
                )
            ]
        )
        self.memberships = ConflictMembershipRepository()
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store
        self.app.dependency_overrides[get_member_repository] = lambda: self.members
        self.app.dependency_overrides[get_membership_repository] = lambda: self.memberships

        response = self.client.post("/forms/join-requests/join-1/approve", json={"role": "member"})

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json(),
            {
                "detail": (
                    "Join request could not be approved because the membership could not "
                    "be created."
                )
            },
        )

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
        self.assertEqual(len(self.audit_repository.audit_logs), 1)

    def test_club_manager_can_review_requests_for_an_assigned_club(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = (
            lambda: build_club_manager_access("club-1")
        )
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

        response = self.client.get("/forms/join-requests/club-1/pending")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_club_manager_is_rejected_for_join_requests_on_other_clubs(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = (
            lambda: build_club_manager_access("club-1")
        )
        self.store = FakeJoinRequestStore(
            seeded=[
                JoinRequest(
                    id="join-9",
                    organization_id="org-1",
                    club_id="club-9",
                    submitter_name="Taylor Student",
                    submitter_email="taylor@example.edu",
                )
            ]
        )
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store

        pending_response = self.client.get("/forms/join-requests/club-9/pending")
        self.assertEqual(pending_response.status_code, 403)

        approve_response = self.client.post(
            "/forms/join-requests/join-9/approve",
            json={"role": "member"},
        )
        self.assertEqual(approve_response.status_code, 403)

        deny_response = self.client.post("/forms/join-requests/join-9/deny")
        self.assertEqual(deny_response.status_code, 403)
