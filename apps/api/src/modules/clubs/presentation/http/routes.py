from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import (
    get_club_event_publisher,
    get_club_repository,
    get_dashboard_summary_cache,
)
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.presentation.http.cache import invalidate_dashboard_cache
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
    request: CreateClubRequest,
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    publisher: Annotated[ClubEventPublisher, Depends(get_club_event_publisher)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
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

    invalidate_dashboard_cache(dashboard_cache, club.id)
    return ClubResponse.from_domain(club)


@router.patch("/{club_id}", response_model=ClubResponse)
def update_club(
    club_id: str,
    request: UpdateClubRequest,
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> ClubResponse:
    try:
        club = UpdateClub(repository=repository).execute(
            club_id,
            **request.model_dump(exclude_unset=True),
        )
    except ClubConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    invalidate_dashboard_cache(dashboard_cache, club.id)
    return ClubResponse.from_domain(club)


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    repository: Annotated[ClubRepository, Depends(get_club_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> Response:
    deleted = DeleteClub(repository=repository).execute(club_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    invalidate_dashboard_cache(dashboard_cache, club_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
