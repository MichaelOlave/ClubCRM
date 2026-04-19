from datetime import UTC, datetime
from typing import Any

from src.modules.audit.application.commands.record_audit_log import RecordAuditLog
from src.modules.audit.application.models import AuditLogWrite
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.domain.entities import AuditLog
from src.presentation.http.request_context import AuthenticatedRequestContext


def record_audit_action(
    *,
    repository: AuditLogRepository,
    context: AuthenticatedRequestContext,
    action: str,
    resource_type: str,
    resource_id: str,
    resource_label: str | None = None,
    summary_json: dict[str, Any] | None = None,
) -> AuditLog:
    return RecordAuditLog(repository=repository).execute(
        AuditLogWrite(
            occurred_at=datetime.now(UTC),
            actor_sub=context.current_user.sub,
            actor_email=context.current_user.email,
            actor_name=context.current_user.name,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_label=resource_label,
            api_route=context.api_route,
            http_method=context.http_method,
            origin_path=context.origin_path,
            request_id=context.request_id,
            summary_json=summary_json or {},
        )
    )
