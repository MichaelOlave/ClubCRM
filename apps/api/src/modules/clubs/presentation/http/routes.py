from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_club_event_publisher,
    get_club_repository,
)
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.presentation.http.helpers import record_audit_action
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


@router.get("/", response_model=list[ClubResponse])
def list_clubs(
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    organization_id: str | None = None,
) -> list[ClubResponse]:
    clubs = ListClubs(repository=repository).execute(organization_id)
    return [ClubResponse.from_domain(club) for club in clubs]


@router.get("/{club_id}", response_model=ClubResponse)
def get_club(
    club_id: str,
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
) -> ClubResponse:
    club = GetClub(repository=repository).execute(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    return ClubResponse.from_domain(club)


@router.post("/", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
def create_club(
    payload: CreateClubRequest,
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    publisher: Annotated[ClubEventPublisher, Depends(get_club_event_publisher)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
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
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> ClubResponse:
    changed_fields = sorted(payload.model_dump(exclude_unset=True).keys())
    try:
        club = UpdateClub(repository=repository).execute(
            club_id,
            **payload.model_dump(exclude_unset=True),
        )
    except ClubConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="update",
        resource_type="club",
        resource_id=club.id,
        resource_label=club.name,
        summary_json=_build_club_summary(club, changed_fields=changed_fields),
    )
    return ClubResponse.from_domain(club)


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> Response:
    existing_club = repository.get_club(club_id)
    if existing_club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    deleted = DeleteClub(repository=repository).execute(club_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

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
