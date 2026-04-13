from dataclasses import asdict
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import (
    get_announcement_repository,
    get_dashboard_summary_cache,
)
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.presentation.http.cache import invalidate_dashboard_cache
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
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
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

    invalidate_dashboard_cache(dashboard_cache, announcement.club_id)
    return _to_announcement_read(announcement)


@router.patch("/{announcement_id}", response_model=AnnouncementRead)
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdateRequest,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> AnnouncementRead:
    try:
        existing_announcement = GetAnnouncement(repository=repository).execute(announcement_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

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

    invalidate_dashboard_cache(
        dashboard_cache,
        existing_announcement.club_id,
        announcement.club_id,
    )
    return _to_announcement_read(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: str,
    repository: Annotated[AnnouncementRepository, Depends(get_announcement_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> Response:
    try:
        announcement = GetAnnouncement(repository=repository).execute(announcement_id)
        DeleteAnnouncement(repository=repository).execute(announcement_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, announcement.club_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
