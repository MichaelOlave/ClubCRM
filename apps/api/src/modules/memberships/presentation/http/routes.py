from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import get_membership_repository
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
    request: CreateMembershipRequest,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
) -> MembershipResponse:
    try:
        membership = CreateMembership(repository=repository).execute(
            club_id=request.club_id,
            member_id=request.member_id,
            role=request.role,
            status=request.status,
        )
    except MembershipConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return MembershipResponse.from_domain(membership)


@router.patch("/{membership_id}", response_model=MembershipResponse)
def update_membership(
    membership_id: str,
    request: UpdateMembershipRequest,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
) -> MembershipResponse:
    try:
        membership = UpdateMembership(repository=repository).execute(
            membership_id,
            **request.model_dump(exclude_unset=True),
        )
    except MembershipConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    return MembershipResponse.from_domain(membership)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_membership(
    membership_id: str,
    repository: Annotated[MembershipRepository, Depends(get_membership_repository)],
) -> Response:
    deleted = DeleteMembership(repository=repository).execute(membership_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
