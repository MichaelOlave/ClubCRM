from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import get_audit_log_repository, get_membership_repository
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.presentation.http.helpers import record_audit_action
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
    MembershipConflictError,
    MembershipRepository,
)
from src.modules.memberships.application.queries.get_membership import GetMembership
from src.modules.memberships.application.queries.list_memberships import ListMemberships
from src.modules.memberships.domain.entities import Membership
from src.presentation.http.request_context import (
    AuthenticatedRequestContext,
    get_authenticated_write_context,
)

router = APIRouter(prefix="/memberships", tags=["memberships"])


class MembershipResponse(BaseModel):
    id: str
    club_id: str
    member_id: str
    role: str
    status: str
    joined_at: str | None = None

    @classmethod
    def from_domain(cls, membership: Membership) -> "MembershipResponse":
        return cls(
            id=membership.id,
            club_id=membership.club_id,
            member_id=membership.member_id,
            role=membership.role,
            status=membership.status,
            joined_at=membership.joined_at.isoformat() if membership.joined_at else None,
        )


class CreateMembershipRequest(BaseModel):
    club_id: str
    member_id: str
    role: str = "member"
    status: str = "active"


class UpdateMembershipRequest(BaseModel):
    role: str | None = None
    status: str | None = None


def _build_membership_label(membership: Membership) -> str:
    return f"{membership.member_id} in {membership.club_id}"


def _build_membership_summary(
    membership: Membership,
    *,
    changed_fields: list[str] | None = None,
) -> dict[str, object]:
    summary: dict[str, object] = {
        "club_id": membership.club_id,
        "member_id": membership.member_id,
        "role": membership.role,
        "status": membership.status,
    }
    if changed_fields:
        summary["changed_fields"] = changed_fields
    return summary


@router.get("/", response_model=list[MembershipResponse])
def list_memberships(
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
    club_id: str | None = None,
    member_id: str | None = None,
) -> list[MembershipResponse]:
    memberships = ListMemberships(repository=repository).execute(
        club_id=club_id,
        member_id=member_id,
    )
    return [MembershipResponse.from_domain(membership) for membership in memberships]


@router.get("/{membership_id}", response_model=MembershipResponse)
def get_membership(
    membership_id: str,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
) -> MembershipResponse:
    membership = GetMembership(repository=repository).execute(membership_id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    return MembershipResponse.from_domain(membership)


@router.post("/", response_model=MembershipResponse, status_code=status.HTTP_201_CREATED)
def create_membership(
    payload: CreateMembershipRequest,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> MembershipResponse:
    try:
        membership = CreateMembership(repository=repository).execute(
            club_id=payload.club_id,
            member_id=payload.member_id,
            role=payload.role,
            status=payload.status,
        )
    except MembershipConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="create",
        resource_type="membership",
        resource_id=membership.id,
        resource_label=_build_membership_label(membership),
        summary_json=_build_membership_summary(membership),
    )
    return MembershipResponse.from_domain(membership)


@router.patch("/{membership_id}", response_model=MembershipResponse)
def update_membership(
    membership_id: str,
    payload: UpdateMembershipRequest,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> MembershipResponse:
    changed_fields = sorted(payload.model_dump(exclude_unset=True).keys())
    try:
        membership = UpdateMembership(repository=repository).execute(
            membership_id,
            **payload.model_dump(exclude_unset=True),
        )
    except MembershipConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="update",
        resource_type="membership",
        resource_id=membership.id,
        resource_label=_build_membership_label(membership),
        summary_json=_build_membership_summary(membership, changed_fields=changed_fields),
    )
    return MembershipResponse.from_domain(membership)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_membership(
    membership_id: str,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> Response:
    membership = repository.get_membership(membership_id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    deleted = DeleteMembership(repository=repository).execute(membership_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="delete",
        resource_type="membership",
        resource_id=membership.id,
        resource_label=_build_membership_label(membership),
        summary_json=_build_membership_summary(membership),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
