from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from src.bootstrap.dependencies import get_member_repository
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

router = APIRouter(prefix="/members", tags=["members"])


def _member_response(member) -> MemberReadModel:
    return MemberReadModel.model_validate(member)


@router.get("/", response_model=list[MemberReadModel])
def list_members(
    organization_id: str,
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
) -> list[MemberReadModel]:
    members = ListMembers(repository=repository).execute(organization_id)
    return [_member_response(member) for member in members]


@router.get("/{member_id}", response_model=MemberReadModel)
def read_member(
    member_id: str,
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
) -> MemberReadModel:
    member = GetMember(repository=repository).execute(member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    return _member_response(member)


@router.post("/", response_model=MemberReadModel, status_code=status.HTTP_201_CREATED)
def create_member(
    payload: MemberCreateRequest,
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
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

    return _member_response(member)


@router.patch("/{member_id}", response_model=MemberReadModel)
def update_member(
    member_id: str,
    payload: MemberUpdateRequest,
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
) -> MemberReadModel:
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

    return _member_response(member)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: str,
    repository: Annotated[MemberRepository, Depends(get_member_repository)],
) -> Response:
    deleted = DeleteMember(repository=repository).execute(member_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
