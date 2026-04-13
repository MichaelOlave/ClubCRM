import unittest
from dataclasses import replace
from datetime import datetime

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.modules.forms.application.commands.approve_join_request import ApproveJoinRequest
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member
from src.modules.memberships.application.ports.membership_repository import (
    MembershipConflictError,
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership


def _make_join_request(**kwargs) -> JoinRequest:
    defaults = dict(
        id="jr-1",
        organization_id="org-1",
        club_id="club-1",
        submitter_name="Taylor Student",
        submitter_email="taylor@example.edu",
        status="pending",
    )
    return JoinRequest(**{**defaults, **kwargs})


def _make_member(**kwargs) -> Member:
    defaults = dict(
        id="member-1",
        organization_id="org-1",
        first_name="Taylor",
        last_name="Student",
        email="taylor@example.edu",
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )
    return Member(**{**defaults, **kwargs})


def _make_membership(**kwargs) -> Membership:
    defaults = dict(
        id="ms-1",
        club_id="club-1",
        member_id="member-1",
        role="General member",
        status="active",
        joined_at=datetime(2024, 1, 1),
    )
    return Membership(**{**defaults, **kwargs})


class FakeJoinRequestStore(JoinRequestStore):
    def __init__(self, join_request: JoinRequest) -> None:
        self._data = {join_request.id: join_request}

    def save(self, join_request: JoinRequest) -> JoinRequest:
        return replace(join_request, id="new-jr")

    def list_pending(self, club_id: str) -> list[JoinRequest]:
        return [
            jr for jr in self._data.values() if jr.status == "pending" and jr.club_id == club_id
        ]

    def get(self, join_request_id: str) -> JoinRequest | None:
        return self._data.get(join_request_id)

    def update_status(self, join_request_id: str, status: str) -> JoinRequest:
        jr = self._data[join_request_id]
        updated = replace(jr, status=status)
        self._data[join_request_id] = updated
        return updated


class FakeMemberRepository(MemberRepository):
    def __init__(self, existing: Member | None = None) -> None:
        self._members: dict[str, Member] = {}
        if existing:
            self._members[existing.id] = existing

    def list_members(self, organization_id: str) -> list[Member]:
        return list(self._members.values())

    def get_member(self, member_id: str) -> Member | None:
        return self._members.get(member_id)

    def find_by_email(self, organization_id: str, email: str) -> Member | None:
        return next(
            (
                m
                for m in self._members.values()
                if m.email == email and m.organization_id == organization_id
            ),
            None,
        )

    def create_member(self, member: CreateMemberInput) -> Member:
        new = Member(
            id=f"new-member-{len(self._members)}",
            organization_id=member.organization_id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            student_id=member.student_id,
        )
        self._members[new.id] = new
        return new

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

    def delete_member(self, member_id: str) -> bool:
        return self._members.pop(member_id, None) is not None


class FakeMembershipRepository(MembershipRepository):
    def __init__(self, existing: Membership | None = None, raise_on_create: bool = False) -> None:
        self._memberships: dict[str, Membership] = {}
        if existing:
            self._memberships[existing.id] = existing
        self._raise_on_create = raise_on_create

    def list_memberships(self, club_id=None, member_id=None) -> list[Membership]:
        return [
            m for m in self._memberships.values()
            if (club_id is None or m.club_id == club_id)
            and (member_id is None or m.member_id == member_id)
        ]

    def get_membership(self, membership_id: str) -> Membership | None:
        return self._memberships.get(membership_id)

    def create_membership(self, club_id, member_id, role, status) -> Membership:
        if self._raise_on_create:
            raise MembershipConflictError("duplicate")
        new = Membership(
            id=f"new-ms-{len(self._memberships)}",
            club_id=club_id,
            member_id=member_id,
            role=role,
            status=status,
            joined_at=datetime(2024, 1, 1),
        )
        self._memberships[new.id] = new
        return new

    def update_membership(self, membership_id, *, role=None, status=None):
        return self._memberships.get(membership_id)

    def delete_membership(self, membership_id: str) -> bool:
        return self._memberships.pop(membership_id, None) is not None


class ApproveJoinRequestTests(unittest.TestCase):
    def _command(self, jr=None, member=None, membership=None, raise_on_create=False):
        return ApproveJoinRequest(
            join_request_store=FakeJoinRequestStore(jr or _make_join_request()),
            member_repository=FakeMemberRepository(existing=member),
            membership_repository=FakeMembershipRepository(
                existing=membership, raise_on_create=raise_on_create
            ),
        )

    def test_success_creates_member_and_membership(self):
        result = self._command().execute("jr-1")

        self.assertEqual(result.join_request.status, "approved")
        self.assertEqual(result.member.email, "taylor@example.edu")
        self.assertEqual(result.member.first_name, "Taylor")
        self.assertEqual(result.member.last_name, "Student")
        self.assertTrue(result.member_created)
        self.assertTrue(result.membership_created)

    def test_reuses_existing_member_by_email(self):
        existing = _make_member(id="existing-member")
        result = self._command(member=existing).execute("jr-1")

        self.assertEqual(result.member.id, "existing-member")
        self.assertFalse(result.member_created)

    def test_creates_member_with_student_id_from_join_request(self):
        jr = _make_join_request(payload={"student_id": "S12345"})
        result = self._command(jr=jr).execute("jr-1")

        self.assertEqual(result.member.student_id, "S12345")

    def test_backfills_missing_student_id_for_existing_member(self):
        jr = _make_join_request(payload={"student_id": "S12345"})
        existing = _make_member(id="existing-member", student_id=None)
        result = self._command(jr=jr, member=existing).execute("jr-1")

        self.assertEqual(result.member.id, "existing-member")
        self.assertEqual(result.member.student_id, "S12345")
        self.assertFalse(result.member_created)

    def test_reuses_existing_membership(self):
        existing_member = _make_member(id="m-1")
        existing_membership = _make_membership(member_id="m-1")
        result = self._command(
            member=existing_member, membership=existing_membership
        ).execute("jr-1")

        self.assertEqual(result.membership.id, "ms-1")
        self.assertFalse(result.membership_created)

    def test_handles_race_condition_on_membership_create(self):
        existing_member = _make_member(id="m-1")
        existing_membership = _make_membership(member_id="m-1")
        # Simulate conflict on create — but membership exists to fall back to
        cmd = ApproveJoinRequest(
            join_request_store=FakeJoinRequestStore(_make_join_request()),
            member_repository=FakeMemberRepository(existing=existing_member),
            membership_repository=FakeMembershipRepository(
                existing=existing_membership, raise_on_create=True
            ),
        )
        result = cmd.execute("jr-1")

        self.assertEqual(result.membership.id, "ms-1")
        self.assertFalse(result.membership_created)

    def test_raises_when_join_request_not_found(self):
        store = FakeJoinRequestStore(_make_join_request())
        cmd = ApproveJoinRequest(
            join_request_store=store,
            member_repository=FakeMemberRepository(),
            membership_repository=FakeMembershipRepository(),
        )
        with self.assertRaises(ValueError, msg="not found"):
            cmd.execute("nonexistent-id")

    def test_raises_when_already_approved(self):
        jr = _make_join_request(status="approved")
        with self.assertRaises(ValueError, msg="approved"):
            self._command(jr=jr).execute("jr-1")

    def test_single_word_name_sets_empty_last_name(self):
        jr = _make_join_request(submitter_name="Taylor")
        result = self._command(jr=jr).execute("jr-1")

        self.assertEqual(result.member.first_name, "Taylor")
        self.assertEqual(result.member.last_name, "")
