from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_authorization_repository,
    get_club_event_publisher,
    get_club_repository,
    get_dashboard_summary_cache,
)
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.presentation.http.helpers import record_audit_action
from src.modules.auth.application.ports.authorization_repository import (
    AuthorizationConflictError,
    AuthorizationRepository,
)
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import (
    ensure_club_access,
    require_authorized_access,
    require_org_admin_access,
)
from src.modules.clubs.application.commands.create_club import CreateClub
from src.modules.clubs.application.commands.delete_club import DeleteClub
from src.modules.clubs.application.commands.update_club import UpdateClub
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import (
    ClubConflictError,
    ClubRepository,
)
from src.modules.clubs.application.queries.get_club import GetClub
from src.modules.clubs.application.queries.list_clubs import ListClubs
from src.modules.clubs.domain.entities import Club
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.presentation.http.cache import invalidate_dashboard_cache
from src.presentation.http.request_context import (
    AuthenticatedRequestContext,
    get_authenticated_write_context,
)

router = APIRouter(prefix="/clubs", tags=["clubs"])


class ClubResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str
    status: str

    @classmethod
    def from_domain(cls, club: Club) -> "ClubResponse":
        return cls(
            id=club.id,
            organization_id=club.organization_id,
            name=club.name,
            description=club.description,
            status=club.status,
        )


class CreateClubRequest(BaseModel):
    organization_id: str
    name: str
    description: str = ""
    status: str = "active"


class UpdateClubRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


def _build_club_summary(
    club: Club,
    *,
    changed_fields: list[str] | None = None,
) -> dict[str, object]:
    summary: dict[str, object] = {
        "organization_id": club.organization_id,
        "status": club.status,
    }
    if changed_fields:
        summary["changed_fields"] = changed_fields
    return summary


class ClubManagerGrantResponse(BaseModel):
    id: str
    club_id: str
    member_id: str
    role_name: str
    assigned_at: str
    member_email: str
    member_name: str


class CreateClubManagerGrantRequest(BaseModel):
    member_id: str
    role_name: str


@router.get("/", response_model=list[ClubResponse])
def list_clubs(
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    organization_id: str | None = None,
) -> list[ClubResponse]:
    effective_organization_id = organization_id
    if access.primary_role != "org_admin":
        if organization_id is not None and organization_id != access.organization_id:
            return []
        effective_organization_id = access.organization_id

    clubs = ListClubs(repository=repository).execute(effective_organization_id)
    if access.primary_role != "org_admin":
        clubs = [club for club in clubs if club.id in access.managed_club_ids]
    return [ClubResponse.from_domain(club) for club in clubs]


@router.get("/{club_id}", response_model=ClubResponse)
def get_club(
    club_id: str,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
) -> ClubResponse:
    club = GetClub(repository=repository).execute(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    ensure_club_access(access, club.id)
    return ClubResponse.from_domain(club)


@router.post("/", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
def create_club(
    payload: CreateClubRequest,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    publisher: Annotated[ClubEventPublisher, Depends(get_club_event_publisher)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> ClubResponse:
    try:
        club = CreateClub(repository=repository, publisher=publisher).execute(
            organization_id=payload.organization_id,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )
    except ClubConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, club.id)
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="create",
        resource_type="club",
        resource_id=club.id,
        resource_label=club.name,
        summary_json=_build_club_summary(club),
    )
    return ClubResponse.from_domain(club)


@router.patch("/{club_id}", response_model=ClubResponse)
def update_club(
    club_id: str,
    payload: UpdateClubRequest,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> ClubResponse:
    changed_fields = sorted(payload.model_dump(exclude_unset=True).keys())
    existing_club = GetClub(repository=repository).execute(club_id)
    if existing_club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    ensure_club_access(access, existing_club.id)
    try:
        updated_club = UpdateClub(repository=repository).execute(
            club_id,
            **payload.model_dump(exclude_unset=True),
        )
    except ClubConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if updated_club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    invalidate_dashboard_cache(dashboard_cache, updated_club.id)
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="update",
        resource_type="club",
        resource_id=updated_club.id,
        resource_label=updated_club.name,
        summary_json=_build_club_summary(updated_club, changed_fields=changed_fields),
    )
    return ClubResponse.from_domain(updated_club)


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> Response:
    existing_club = repository.get_club(club_id)
    if existing_club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    deleted = DeleteClub(repository=repository).execute(club_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    invalidate_dashboard_cache(dashboard_cache, club_id)
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="delete",
        resource_type="club",
        resource_id=existing_club.id,
        resource_label=existing_club.name,
        summary_json=_build_club_summary(existing_club),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{club_id}/manager-grants", response_model=list[ClubManagerGrantResponse])
def list_club_manager_grants(
    club_id: str,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    authorization_repository: Annotated[
        AuthorizationRepository,
        Depends(get_authorization_repository),
    ],
) -> list[ClubManagerGrantResponse]:
    club = GetClub(repository=repository).execute(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    return [
        ClubManagerGrantResponse(
            id=grant.id,
            club_id=grant.club_id,
            member_id=grant.member_id,
            role_name=grant.role_name,
            assigned_at=grant.assigned_at.isoformat(),
            member_email=grant.member_email,
            member_name=grant.member_name,
        )
        for grant in authorization_repository.list_club_manager_grants(club_id)
    ]


@router.post(
    "/{club_id}/manager-grants",
    response_model=ClubManagerGrantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_club_manager_grant(
    club_id: str,
    request: CreateClubManagerGrantRequest,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    authorization_repository: Annotated[
        AuthorizationRepository,
        Depends(get_authorization_repository),
    ],
) -> ClubManagerGrantResponse:
    club = GetClub(repository=repository).execute(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    try:
        grant = authorization_repository.create_club_manager_grant(
            club_id=club_id,
            member_id=request.member_id,
            role_name=request.role_name,
        )
    except AuthorizationConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return ClubManagerGrantResponse(
        id=grant.id,
        club_id=grant.club_id,
        member_id=grant.member_id,
        role_name=grant.role_name,
        assigned_at=grant.assigned_at.isoformat(),
        member_email=grant.member_email,
        member_name=grant.member_name,
    )


@router.delete("/{club_id}/manager-grants/{grant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club_manager_grant(
    club_id: str,
    grant_id: str,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    authorization_repository: Annotated[
        AuthorizationRepository,
        Depends(get_authorization_repository),
    ],
) -> Response:
    club = GetClub(repository=repository).execute(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    deleted = authorization_repository.delete_club_manager_grant(club_id=club_id, grant_id=grant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club manager grant not found.",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
