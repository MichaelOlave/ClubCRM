from dataclasses import dataclass

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


@dataclass(frozen=True)
class ApprovalResult:
    join_request: JoinRequest
    member: Member
    membership: Membership
    member_created: bool
    membership_created: bool


@dataclass
class ApproveJoinRequest:
    join_request_store: JoinRequestStore
    member_repository: MemberRepository
    membership_repository: MembershipRepository

    def execute(self, join_request_id: str, role: str = "General member") -> ApprovalResult:
        join_request = self.join_request_store.get(join_request_id)
        if join_request is None:
            raise ValueError(f"Join request {join_request_id!r} not found.")
        if join_request.status != "pending":
            raise ValueError(
                f"Join request {join_request_id!r} has status {join_request.status!r} "
                "and cannot be approved."
            )

        member, member_created = self._find_or_create_member(join_request)
        membership, membership_created = self._find_or_create_membership(
            join_request.club_id, member.id, role
        )
        approved = self.join_request_store.update_status(join_request_id, "approved")

        return ApprovalResult(
            join_request=approved,
            member=member,
            membership=membership,
            member_created=member_created,
            membership_created=membership_created,
        )

    def _find_or_create_member(self, join_request: JoinRequest) -> tuple[Member, bool]:
        member = self.member_repository.find_by_email(
            join_request.organization_id, join_request.submitter_email
        )
        if member is not None:
            student_id = join_request.payload.get("student_id")
            if isinstance(student_id, str) and student_id and member.student_id is None:
                updated_member = self.member_repository.update_member(
                    member.id,
                    UpdateMemberInput(student_id=student_id),
                )
                if updated_member is not None:
                    return updated_member, False
            return member, False

        name_parts = join_request.submitter_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        student_id = join_request.payload.get("student_id")

        member = self.member_repository.create_member(
            CreateMemberInput(
                organization_id=join_request.organization_id,
                first_name=first_name,
                last_name=last_name,
                email=join_request.submitter_email,
                student_id=student_id if isinstance(student_id, str) and student_id else None,
            )
        )
        return member, True

    def _find_or_create_membership(
        self, club_id: str, member_id: str, role: str
    ) -> tuple[Membership, bool]:
        existing = self.membership_repository.list_memberships(club_id=club_id, member_id=member_id)
        if existing:
            return existing[0], False

        try:
            membership = self.membership_repository.create_membership(
                club_id=club_id,
                member_id=member_id,
                role=role,
                status="active",
            )
            return membership, True
        except MembershipConflictError:
            # Race condition: inserted between check and create — fetch and return.
            existing = self.membership_repository.list_memberships(
                club_id=club_id, member_id=member_id
            )
            if existing:
                return existing[0], False

        raise ValueError(
            "Join request could not be approved because the membership could not be created."
        )
