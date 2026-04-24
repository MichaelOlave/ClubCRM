import unittest
from datetime import UTC, datetime

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.memberships.application.commands.create_membership import (
    CreateMembership,
)
from src.modules.memberships.application.commands.delete_membership import (
    DeleteMembership,
)
from src.modules.memberships.application.commands.update_membership import (
    UpdateMembership,
)
from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.modules.memberships.application.queries.get_membership import GetMembership
from src.modules.memberships.application.queries.list_memberships import ListMemberships
from src.modules.memberships.domain.entities import Membership


class FakeMembershipRepository(MembershipRepository):
    def __init__(self) -> None:
        self.memberships: dict[str, Membership] = {
            "membership-1": Membership(
                id="membership-1",
                club_id="club-1",
                member_id="member-1",
                role="member",
                status="active",
                joined_at=datetime.now(UTC),
            )
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
        membership = Membership(
            id="membership-2",
            club_id=club_id,
            member_id=member_id,
            role=role,
            status=status,
            joined_at=datetime.now(UTC),
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
        )
        self.memberships[membership_id] = updated_membership
        return updated_membership

    def delete_membership(self, membership_id: str) -> bool:
        return self.memberships.pop(membership_id, None) is not None


class MembershipBoundaryTests(unittest.TestCase):
    def test_memberships_application_avoids_framework_and_infrastructure_imports(
        self,
    ) -> None:
        violations = collect_import_violations(
            "modules/memberships/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_membership_use_cases_use_port_contracts(self) -> None:
        repository = FakeMembershipRepository()

        created = CreateMembership(repository=repository).execute(
            club_id="club-1",
            member_id="member-2",
            role="secretary",
            status="active",
        )
        listed = ListMemberships(repository=repository).execute(club_id="club-1")
        fetched = GetMembership(repository=repository).execute(created.id)
        updated = UpdateMembership(repository=repository).execute(
            created.id,
            role="vice-president",
            status="inactive",
        )
        deleted = DeleteMembership(repository=repository).execute(created.id)

        self.assertEqual(created.member_id, "member-2")
        self.assertGreaterEqual(len(listed), 1)
        self.assertIsNotNone(fetched)
        self.assertIsNotNone(updated)
        self.assertEqual(updated.status, "inactive")
        self.assertTrue(deleted)
