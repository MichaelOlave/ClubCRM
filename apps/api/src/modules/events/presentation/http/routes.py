from dataclasses import asdict
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from src.bootstrap.dependencies import (
    get_audit_log_repository,
    get_dashboard_summary_cache,
    get_event_repository,
)
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.presentation.http.helpers import record_audit_action
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import (
    ensure_club_access,
    require_authorized_access,
)
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.presentation.http.cache import invalidate_dashboard_cache
from src.modules.events.application.commands.create_event import CreateEvent
from src.modules.events.application.commands.delete_event import DeleteEvent
from src.modules.events.application.commands.update_event import UpdateEvent
from src.modules.events.application.ports.event_repository import (
    UNSET,
    EventConflictError,
    EventRepository,
)
from src.modules.events.application.queries.get_event import GetEvent
from src.modules.events.application.queries.list_events import ListEvents
from src.modules.events.domain.entities import Event
from src.presentation.http.request_context import (
    AuthenticatedRequestContext,
    get_authenticated_write_context,
)

router = APIRouter(prefix="/events", tags=["events"])
DESCRIPTION_MAX_LENGTH = 500


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
    description: str = Field(max_length=DESCRIPTION_MAX_LENGTH)
    starts_at: datetime
    location: str | None = None
    ends_at: datetime | None = None


class EventUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    starts_at: datetime | None = None
    location: str | None = None
    ends_at: datetime | None = None


def _build_event_summary(
    event: Event,
    *,
    changed_fields: list[str] | None = None,
) -> dict[str, object]:
    summary: dict[str, object] = {
        "club_id": event.club_id,
        "starts_at": event.starts_at.isoformat(),
        "location": event.location,
    }
    if changed_fields:
        summary["changed_fields"] = changed_fields
    return summary


def _to_event_read(event) -> EventRead:
    return EventRead(**asdict(event))


def _validate_event_schedule(starts_at: datetime, ends_at: datetime | None) -> None:
    normalized_starts_at = (
        starts_at if starts_at.tzinfo is not None else starts_at.replace(tzinfo=UTC)
    )

    if ends_at is not None:
        normalized_ends_at = ends_at if ends_at.tzinfo is not None else ends_at.replace(tzinfo=UTC)
    else:
        normalized_ends_at = None

    if normalized_ends_at is not None and normalized_ends_at <= normalized_starts_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Event end time must be after the start time.",
        )


@router.get("", response_model=list[EventRead])
def list_events(
    club_id: str,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[EventRepository, Depends(get_event_repository)],
) -> list[EventRead]:
    ensure_club_access(access, club_id)
    events = ListEvents(repository=repository).execute(club_id)
    return [_to_event_read(event) for event in events]


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: str,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[EventRepository, Depends(get_event_repository)],
) -> EventRead:
    try:
        event = GetEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    ensure_club_access(access, event.club_id)
    return _to_event_read(event)


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[EventRepository, Depends(get_event_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> EventRead:
    ensure_club_access(access, payload.club_id)
    _validate_event_schedule(payload.starts_at, payload.ends_at)
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
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="create",
        resource_type="event",
        resource_id=event.id,
        resource_label=event.title,
        summary_json=_build_event_summary(event),
    )
    return _to_event_read(event)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: str,
    payload: EventUpdateRequest,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[EventRepository, Depends(get_event_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> EventRead:
    update_payload = payload.model_dump(exclude_unset=True)
    changed_fields = sorted(update_payload.keys())
    try:
        existing_event = GetEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    ensure_club_access(access, existing_event.club_id)
    effective_starts_at = (
        payload.starts_at if "starts_at" in update_payload else existing_event.starts_at
    )
    effective_ends_at = payload.ends_at if "ends_at" in update_payload else existing_event.ends_at
    _validate_event_schedule(effective_starts_at, effective_ends_at)
    try:
        event = UpdateEvent(repository=repository).execute(
            event_id,
            title=payload.title,
            description=payload.description,
            starts_at=payload.starts_at,
            location=payload.location if "location" in update_payload else UNSET,
            ends_at=payload.ends_at if "ends_at" in update_payload else UNSET,
        )
    except EventConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, existing_event.club_id, event.club_id)
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="update",
        resource_type="event",
        resource_id=event.id,
        resource_label=event.title,
        summary_json=_build_event_summary(event, changed_fields=changed_fields),
    )
    return _to_event_read(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    access: Annotated[AppAccess, Depends(require_authorized_access)],
    repository: Annotated[EventRepository, Depends(get_event_repository)],
    audit_repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    dashboard_cache: Annotated[DashboardSummaryCache, Depends(get_dashboard_summary_cache)],
    context: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_write_context)],
) -> Response:
    try:
        event = GetEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    ensure_club_access(access, event.club_id)
    try:
        DeleteEvent(repository=repository).execute(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    invalidate_dashboard_cache(dashboard_cache, event.club_id)
    record_audit_action(
        repository=audit_repository,
        context=context,
        action="delete",
        resource_type="event",
        resource_id=event.id,
        resource_label=event.title,
        summary_json=_build_event_summary(event),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
