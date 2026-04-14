from dataclasses import asdict
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import (
    get_announcement_repository,
    get_audit_log_repository,
)
from src.modules.announcements.application.commands.create_announcement import (
    CreateAnnouncement,
)
from src.modules.announcements.application.commands.delete_announcement import (
    DeleteAnnouncement,
)
from src.modules.announcements.application.commands.update_announcement import (
    UpdateAnnouncement,
)
from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementConflictError,
    AnnouncementRepository,
)
from src.modules.announcements.application.queries.get_announcement import (
    GetAnnouncement,
)
from src.modules.announcements.application.queries.list_announcements import (
    ListAnnouncements,
)
from src.modules.announcements.domain.entities import Announcement
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.presentation.http.helpers import record_audit_action
from src.presentation.http.request_context import (
    AuthenticatedRequestContext,
    get_authenticated_write_context,
)

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementRead(BaseModel):
    id: str
    club_id: str
    title: str
    body: str
    published_at: datetime
    created_by: str | None = None


class AnnouncementCreateRequest(BaseModel):
    club_id: str
    title: str
    body: str
    published_at: datetime | None = None
    created_by: str | None = None


class AnnouncementUpdateRequest(BaseModel):
    title: str | None = None
    body: str | None = None
    published_at: datetime | None = None
    created_by: str | None = None


def _build_announcement_summary(
    announcement: Announcement,
    *,
    changed_fields: list[str] | None = None,
) -> dict[str, object]:
    summary: dict[str, object] = {
        "club_id": announcement.club_id,
        "published_at": announcement.published_at.isoformat(),
    }
    if changed_fields:
        summary["changed_fields"] = changed_fields
    return summary


def _to_announcement_read(announcement) -> AnnouncementRead:
    return AnnouncementRead(**asdict(announcement))


@router.get("", response_model=list[AnnouncementRead])
def list_announcements(
    club_id: str,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
) -> list[AnnouncementRead]:
    announcements = ListAnnouncements(repository=repository).execute(club_id)
    return [_to_announcement_read(announcement) for announcement in announcements]


@router.get("/{announcement_id}", response_model=AnnouncementRead)
def get_announcement(
    announcement_id: str,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
) -> AnnouncementRead:
    try:
        announcement = GetAnnouncement(repository=repository).execute(announcement_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return _to_announcement_read(announcement)


@router.post("", response_model=AnnouncementRead, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreateRequest,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> AnnouncementRead:
    try:
        announcement = CreateAnnouncement(repository=repository).execute(
            club_id=payload.club_id,
            title=payload.title,
            body=payload.body,
            published_at=payload.published_at,
            created_by=payload.created_by,
        )
    except AnnouncementConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="create",
        resource_type="announcement",
        resource_id=announcement.id,
        resource_label=announcement.title,
        summary_json=_build_announcement_summary(announcement),
    )
    return _to_announcement_read(announcement)


@router.patch("/{announcement_id}", response_model=AnnouncementRead)
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdateRequest,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> AnnouncementRead:
    changed_fields = sorted(payload.model_dump(exclude_unset=True).keys())
    try:
        announcement = UpdateAnnouncement(repository=repository).execute(
            announcement_id,
            title=payload.title,
            body=payload.body,
            published_at=payload.published_at,
            created_by=payload.created_by,
        )
    except AnnouncementConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="update",
        resource_type="announcement",
        resource_id=announcement.id,
        resource_label=announcement.title,
        summary_json=_build_announcement_summary(announcement, changed_fields=changed_fields),
    )
    return _to_announcement_read(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: str,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> Response:
    try:
        announcement = GetAnnouncement(repository=repository).execute(announcement_id)
        DeleteAnnouncement(repository=repository).execute(announcement_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    record_audit_action(
        repository=audit_repository,
        context=context,
        action="delete",
        resource_type="announcement",
        resource_id=announcement.id,
        resource_label=announcement.title,
        summary_json=_build_announcement_summary(announcement),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
