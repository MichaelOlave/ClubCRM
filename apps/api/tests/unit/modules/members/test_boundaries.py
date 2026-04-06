# ruff: noqa: E402,I001
import unittest

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.members.application.commands.create_member import CreateMember
from src.modules.members.application.commands.delete_member import DeleteMember
from src.modules.members.application.commands.update_member import UpdateMember
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.application.queries.get_member import GetMember
from src.modules.members.application.queries.list_members import ListMembers
from src.modules.members.domain.entities import Member


class FakeMemberRepository(MemberRepository):
    def __init__(self) -> None:
        self.members: dict[str, Member] = {}

    def list_members(self, organization_id: str) -> list[Member]:
        return [
            member
            for member in self.members.values()
            if member.organization_id == organization_id
        ]

    def get_member(self, member_id: str) -> Member | None:
        return self.members.get(member_id)

    def create_member(self, member: CreateMemberInput) -> Member:
        created = Member(
            id="member-1",
            organization_id=member.organization_id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            student_id=member.student_id,
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
        )
        self.members[member_id] = updated
        return updated

    def delete_member(self, member_id: str) -> bool:
        return self.members.pop(member_id, None) is not None


class MemberBoundaryTests(unittest.TestCase):
    def test_members_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/members/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_member_use_cases_use_port_contracts(self) -> None:
        repository = FakeMemberRepository()

        created = CreateMember(repository=repository).execute(
            CreateMemberInput(
                organization_id="org-1",
                first_name="Taylor",
                last_name="Student",
                email="taylor@example.edu",
            )
        )

        listed = ListMembers(repository=repository).execute("org-1")
        fetched = GetMember(repository=repository).execute(created.id)
        updated = UpdateMember(repository=repository).execute(
            created.id,
            UpdateMemberInput(first_name="Taylor", last_name="Researcher"),
        )
        deleted = DeleteMember(repository=repository).execute(created.id)

        self.assertEqual(created.email, "taylor@example.edu")
        self.assertEqual(len(listed), 1)
        self.assertIsNotNone(fetched)
        self.assertIsNotNone(updated)
        self.assertTrue(deleted)
