from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_dashboard_summary_cache,
    get_member_repository,
    get_membership_repository,
)
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.presentation.http.helpers import record_audit_action
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import require_org_admin_access
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.presentation.http.cache import invalidate_dashboard_cache
from src.modules.members.application.commands.create_member import CreateMember
from src.modules.members.application.commands.delete_member import DeleteMember
from src.modules.members.application.commands.update_member import UpdateMember
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.application.queries.get_member import GetMember
from src.modules.members.application.queries.list_members import ListMembers
from src.modules.members.presentation.http.schemas import (
    MemberCreateRequest,
    MemberReadModel,
    MemberUpdateRequest,
)
from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)
from src.presentation.http.request_context import (
    AuthenticatedRequestContext,
    get_authenticated_write_context,
)

router = APIRouter(prefix="/members", tags=["members"])


def _member_response(member) -> MemberReadModel:
    return MemberReadModel.model_validate(member)


def _build_member_label(member) -> str:
    return f"{member.first_name} {member.last_name}".strip()


def _build_member_summary(
    member,
    *,
    changed_fields: list[str] | None = None,
) -> dict[str, object]:
    summary: dict[str, object] = {
        "organization_id": member.organization_id,
    }
    if changed_fields:
        summary["changed_fields"] = changed_fields
    return summary


@router.get("/", response_model=list[MemberReadModel])
def list_members(
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    organization_id: str,
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
) -> list[MemberReadModel]:
    members = ListMembers(repository=repository).execute(organization_id)
    return [_member_response(member) for member in members]


@router.get("/{member_id}", response_model=MemberReadModel)
def read_member(
    member_id: str,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
) -> MemberReadModel:
    member = GetMember(repository=repository).execute(member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    return _member_response(member)


@router.post("/", response_model=MemberReadModel, status_code=status.HTTP_201_CREATED)
def create_member(
    payload: MemberCreateRequest,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> MemberReadModel:
    try:
        member = CreateMember(repository=repository).execute(
            CreateMemberInput(
                organization_id=payload.organization_id,
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email,
                student_id=payload.student_id,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="create",
        resource_type="member",
        resource_id=member.id,
        resource_label=_build_member_label(member),
        summary_json=_build_member_summary(member),
    )
    return _member_response(member)


@router.patch("/{member_id}", response_model=MemberReadModel)
def update_member(
    member_id: str,
    payload: MemberUpdateRequest,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> MemberReadModel:
    changed_fields = sorted(payload.model_dump(exclude_unset=True).keys())
    try:
        member = UpdateMember(repository=repository).execute(
            member_id,
            UpdateMemberInput(
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email,
                student_id=payload.student_id,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="update",
        resource_type="member",
        resource_id=member.id,
        resource_label=_build_member_label(member),
        summary_json=_build_member_summary(member, changed_fields=changed_fields),
    )
    return _member_response(member)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: str,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
    membership_repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> Response:
    member = repository.get_member(member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    affected_club_ids = [
        membership.club_id
        for membership in membership_repository.list_memberships(member_id=member_id)
    ]

    deleted = DeleteMember(repository=repository).execute(member_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    invalidate_dashboard_cache(dashboard_cache, *affected_club_ids)
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="delete",
        resource_type="member",
        resource_id=member.id,
        resource_label=_build_member_label(member),
        summary_json=_build_member_summary(member),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
