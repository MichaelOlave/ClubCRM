from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import (
    get_authorization_repository,
    get_club_event_publisher,
    get_club_repository,
)
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
    request: CreateClubRequest,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    publisher: Annotated[ClubEventPublisher, Depends(get_club_event_publisher)],
) -> ClubResponse:
    try:
        club = CreateClub(repository=repository, publisher=publisher).execute(
            organization_id=request.organization_id,
            name=request.name,
            description=request.description,
            status=request.status,
        )
    except ClubConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return ClubResponse.from_domain(club)


@router.patch("/{club_id}", response_model=ClubResponse)
def update_club(
    club_id: str,
    request: UpdateClubRequest,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
) -> ClubResponse:
    club = GetClub(repository=repository).execute(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    ensure_club_access(access, club.id)
    try:
        updated_club = UpdateClub(repository=repository).execute(
            club_id,
            **request.model_dump(exclude_unset=True),
        )
    except ClubConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if updated_club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    return ClubResponse.from_domain(updated_club)


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    _access: Annotated[AppAccess, Depends(require_org_admin_access)],
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
) -> Response:
    deleted = DeleteClub(repository=repository).execute(club_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

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
