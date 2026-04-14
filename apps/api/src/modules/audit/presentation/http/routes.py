from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from src.bootstrap.dependencies import get_audit_log_repository
from src.modules.audit.application.models import AuditLogFilters
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.application.queries.list_audit_logs import ListAuditLogs
from src.modules.audit.domain.entities import AuditLog
from src.presentation.http.request_context import (
    AuthenticatedRequestContext,
    get_authenticated_request_context,
)

router = APIRouter(prefix="/audit-logs", tags=["audit"])


class AuditLogActorRead(BaseModel):
    sub: str
    email: str | None = None
    name: str | None = None


class AuditLogResourceRead(BaseModel):
    type: str
    id: str
    label: str | None = None


class AuditLogRead(BaseModel):
    id: str
    occurred_at: datetime
    action: str
    actor: AuditLogActorRead
    resource: AuditLogResourceRead
    api_route: str
    http_method: str
    origin_path: str | None = None
    request_id: str
    summary_json: dict[str, Any]

    @classmethod
    def from_domain(cls, audit_log: AuditLog) -> "AuditLogRead":
        return cls(
            id=audit_log.id,
            occurred_at=audit_log.occurred_at,
            action=audit_log.action,
            actor=AuditLogActorRead(
                sub=audit_log.actor_sub,
                email=audit_log.actor_email,
                name=audit_log.actor_name,
            ),
            resource=AuditLogResourceRead(
                type=audit_log.resource_type,
                id=audit_log.resource_id,
                label=audit_log.resource_label,
            ),
            api_route=audit_log.api_route,
            http_method=audit_log.http_method,
            origin_path=audit_log.origin_path,
            request_id=audit_log.request_id,
            summary_json=audit_log.summary_json,
        )


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    repository: Annotated[AuditLogRepository, Depends(get_audit_log_repository)],
    _context: Annotated[
        AuthenticatedRequestContext,
        Depends(get_authenticated_request_context),
    ],
    action: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    actor_query: str | None = None,
    from_: Annotated[datetime | None, Query(alias="from")] = None,
    to: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[AuditLogRead]:
    audit_logs = ListAuditLogs(repository=repository).execute(
        AuditLogFilters(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            actor_query=actor_query,
            occurred_from=from_,
            occurred_to=to,
            limit=limit,
        )
    )
    return [AuditLogRead.from_domain(audit_log) for audit_log in audit_logs]
