from dataclasses import asdict
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from src.bootstrap.dependencies import get_dashboard_summary_cache, get_event_repository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.presentation.http.cache import invalidate_dashboard_cache
from src.modules.events.application.commands.create_event import CreateEvent
from src.modules.events.application.commands.delete_event import DeleteEvent
from src.modules.events.application.commands.update_event import UpdateEvent
from src.modules.events.application.ports.event_repository import (
    EventConflictError,
    EventRepository,
)
from src.modules.events.application.queries.get_event import GetEvent
from src.modules.events.application.queries.list_events import ListEvents

router = APIRouter(prefix="/events", tags=["events"])


class EventRead(BaseModel):
    id: str
    club_id: str
    title: str
    description: str
    location: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime | None = None


class EventCreateRequest(BaseModel):
    club_id: str
    title: str
    description: str
    starts_at: datetime
    location: str | None = None
    ends_at: datetime | None = None


class EventUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    location: str | None = None
    ends_at: datetime | None = None


def _to_event_read(event) -> EventRead:
    return EventRead(**asdict(event))


@router.get("", response_model=list[EventRead])
def list_events(
    club_id: str,
    repository: Annotated[EventRepository, Depends(get_event_repository)],
) -> list[EventRead]:
    events = ListEvents(repository=repository).execute(club_id)
    return [_to_event_read(event) for event in events]


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: str,
    repository: Annotated[EventRepository, Depends(get_event_repository)],
) -> EventRead:
    try:
        event = GetEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return _to_event_read(event)


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    repository: Annotated[EventRepository, Depends(get_event_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> EventRead:
    try:
        event = CreateEvent(repository=repository).execute(
            club_id=payload.club_id,
            title=payload.title,
            description=payload.description,
            starts_at=payload.starts_at,
            location=payload.location,
            ends_at=payload.ends_at,
        )
    except EventConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, event.club_id)
    return _to_event_read(event)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: str,
    payload: EventUpdateRequest,
    repository: Annotated[EventRepository, Depends(get_event_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> EventRead:
    try:
        existing_event = GetEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    try:
        event = UpdateEvent(repository=repository).execute(
            event_id,
            title=payload.title,
            description=payload.description,
            starts_at=payload.starts_at,
            location=payload.location,
            ends_at=payload.ends_at,
        )
    except EventConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, existing_event.club_id, event.club_id)
    return _to_event_read(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    repository: Annotated[EventRepository, Depends(get_event_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
) -> Response:
    try:
        event = GetEvent(repository=repository).execute(event_id)
        DeleteEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, event.club_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
