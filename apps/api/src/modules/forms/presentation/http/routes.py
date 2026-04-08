from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from src.bootstrap.dependencies import get_form_submission_publisher, get_join_request_store
from src.modules.forms.application.commands.submit_join_request import SubmitJoinRequest
from src.modules.forms.application.ports.form_submission_publisher import FormSubmissionPublisher
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest

router = APIRouter(prefix="/forms", tags=["forms"])


class JoinRequestBody(BaseModel):
    organization_id: str
    submitter_name: str
    submitter_email: EmailStr
    message: str | None = None


class JoinRequestResponse(BaseModel):
    id: str
    status: str


@router.post("/join-request/{club_id}", response_model=JoinRequestResponse, status_code=201)
def create_join_request(
    club_id: str,
    body: JoinRequestBody,
    store: JoinRequestStore = Depends(get_join_request_store),  # noqa: B008
    publisher: FormSubmissionPublisher = Depends(get_form_submission_publisher),  # noqa: B008
) -> JoinRequestResponse:
    join_request = JoinRequest(
        organization_id=body.organization_id,
        club_id=club_id,
        submitter_name=body.submitter_name,
        submitter_email=str(body.submitter_email),
        payload={"message": body.message} if body.message else {},
    )
    result = SubmitJoinRequest(store=store, publisher=publisher).execute(join_request)
    if result.id is None:
        raise RuntimeError("Join request was not persisted.")
    return JoinRequestResponse(id=result.id, status=result.status)
