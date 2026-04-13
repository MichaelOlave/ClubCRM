from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from src.bootstrap.dependencies import (
    get_form_submission_publisher,
    get_join_request_store,
    get_member_repository,
    get_membership_repository,
)
from src.modules.auth.domain.entities import CurrentUser
from src.modules.auth.presentation.http.dependencies import require_authenticated_user, require_csrf
from src.modules.forms.application.commands.approve_join_request import ApproveJoinRequest
from src.modules.forms.application.commands.deny_join_request import DenyJoinRequest
from src.modules.forms.application.commands.submit_join_request import SubmitJoinRequest
from src.modules.forms.application.ports.form_submission_publisher import FormSubmissionPublisher
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.application.queries.list_pending_join_requests import (
    ListPendingJoinRequests,
)
from src.modules.forms.domain.entities import JoinRequest
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.memberships.application.ports.membership_repository import MembershipRepository

router = APIRouter(prefix="/forms", tags=["forms"])


class JoinRequestBody(BaseModel):
    organization_id: str
    submitter_name: str
    submitter_email: EmailStr
    student_id: str | None = None
    role: str | None = None
    message: str | None = None


class JoinRequestResponse(BaseModel):
    id: str
    club_id: str
    submitter_name: str
    submitter_email: str
    student_id: str | None = None
    role: str | None = None
    message: str | None = None
    status: str


class ApproveBody(BaseModel):
    role: str = "General member"


class ApprovalResponse(BaseModel):
    join_request_id: str
    status: str
    member_id: str
    membership_id: str
    member_created: bool
    membership_created: bool


class ReviewResponse(BaseModel):
    join_request_id: str
    status: str


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _to_response(join_request: JoinRequest) -> JoinRequestResponse:
    student_id = join_request.payload.get("student_id")
    role = join_request.payload.get("role")
    message = join_request.payload.get("message")

    return JoinRequestResponse(
        id=join_request.id or "",
        club_id=join_request.club_id,
        submitter_name=join_request.submitter_name,
        submitter_email=join_request.submitter_email,
        student_id=student_id if isinstance(student_id, str) else None,
        role=role if isinstance(role, str) else None,
        message=message if isinstance(message, str) else None,
        status=join_request.status,
    )


@router.post("/join-request/{club_id}", response_model=JoinRequestResponse, status_code=201)
def create_join_request(
    club_id: str,
    body: JoinRequestBody,
    store: JoinRequestStore = Depends(get_join_request_store),  # noqa: B008
    publisher: FormSubmissionPublisher = Depends(get_form_submission_publisher),  # noqa: B008
) -> JoinRequestResponse:
    payload: dict[str, str] = {}

    for key, value in (
        ("student_id", body.student_id),
        ("role", body.role),
        ("message", body.message),
    ):
        normalized = _normalize_optional_text(value)
        if normalized is not None:
            payload[key] = normalized

    join_request = JoinRequest(
        organization_id=body.organization_id,
        club_id=club_id,
        submitter_name=body.submitter_name,
        submitter_email=str(body.submitter_email),
        payload=payload,
    )
    result = SubmitJoinRequest(store=store, publisher=publisher).execute(join_request)
    if result.id is None:
        raise RuntimeError("Join request was not persisted.")
    return _to_response(result)


@router.get("/join-requests/{club_id}/pending", response_model=list[JoinRequestResponse])
def list_pending_join_requests(
    club_id: str,
    _current_user: CurrentUser = Depends(require_authenticated_user),  # noqa: B008
    store: JoinRequestStore = Depends(get_join_request_store),  # noqa: B008
) -> list[JoinRequestResponse]:
    results = ListPendingJoinRequests(store=store).execute(club_id)
    return [_to_response(r) for r in results]


@router.post(
    "/join-requests/{join_request_id}/approve",
    response_model=ApprovalResponse,
    dependencies=[Depends(require_csrf)],
)
def approve_join_request(
    join_request_id: str,
    body: ApproveBody,
    _current_user: CurrentUser = Depends(require_authenticated_user),  # noqa: B008
    store: JoinRequestStore = Depends(get_join_request_store),  # noqa: B008
    member_repository: MemberRepository = Depends(get_member_repository),  # noqa: B008
    membership_repository: MembershipRepository = Depends(get_membership_repository),  # noqa: B008
) -> ApprovalResponse:
    try:
        result = ApproveJoinRequest(
            join_request_store=store,
            member_repository=member_repository,
            membership_repository=membership_repository,
        ).execute(join_request_id, role=body.role)
    except ValueError as exc:
        status_code = 404 if "not found" in str(exc) else 409
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    return ApprovalResponse(
        join_request_id=result.join_request.id or "",
        status=result.join_request.status,
        member_id=result.member.id,
        membership_id=result.membership.id,
        member_created=result.member_created,
        membership_created=result.membership_created,
    )


@router.post(
    "/join-requests/{join_request_id}/deny",
    response_model=ReviewResponse,
    dependencies=[Depends(require_csrf)],
)
def deny_join_request(
    join_request_id: str,
    _current_user: CurrentUser = Depends(require_authenticated_user),  # noqa: B008
    store: JoinRequestStore = Depends(get_join_request_store),  # noqa: B008
) -> ReviewResponse:
    try:
        result = DenyJoinRequest(join_request_store=store).execute(join_request_id)
    except ValueError as exc:
        status_code = 404 if "not found" in str(exc) else 409
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    return ReviewResponse(
        join_request_id=result.id or "",
        status=result.status,
    )
