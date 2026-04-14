from datetime import UTC, datetime

from src.modules.audit.application.models import AuditLogFilters, AuditLogWrite
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.domain.entities import AuditLog
from src.modules.auth.domain.entities import CurrentUser
from src.presentation.http.request_context import AuthenticatedRequestContext


class FakeAuditLogRepository(AuditLogRepository):
    def __init__(self) -> None:
        self.audit_logs: list[AuditLog] = []

    def create_audit_log(self, audit_log: AuditLogWrite) -> AuditLog:
        created = AuditLog(
            id=f"audit-{len(self.audit_logs) + 1}",
            occurred_at=audit_log.occurred_at,
            actor_sub=audit_log.actor_sub,
            actor_email=audit_log.actor_email,
            actor_name=audit_log.actor_name,
            action=audit_log.action,
            resource_type=audit_log.resource_type,
            resource_id=audit_log.resource_id,
            resource_label=audit_log.resource_label,
            api_route=audit_log.api_route,
            http_method=audit_log.http_method,
            origin_path=audit_log.origin_path,
            request_id=audit_log.request_id,
            summary_json=audit_log.summary_json,
        )
        self.audit_logs.append(created)
        return created

    def list_audit_logs(self, filters: AuditLogFilters) -> list[AuditLog]:
        results = list(self.audit_logs)
        if filters.action is not None:
            results = [audit_log for audit_log in results if audit_log.action == filters.action]
        if filters.resource_type is not None:
            results = [
                audit_log
                for audit_log in results
                if audit_log.resource_type == filters.resource_type
            ]
        if filters.resource_id is not None:
            results = [
                audit_log for audit_log in results if audit_log.resource_id == filters.resource_id
            ]
        if filters.actor_query is not None:
            actor_query = filters.actor_query.lower()
            results = [
                audit_log
                for audit_log in results
                if actor_query in audit_log.actor_sub.lower()
                or (audit_log.actor_email or "").lower().find(actor_query) >= 0
                or (audit_log.actor_name or "").lower().find(actor_query) >= 0
            ]
        if filters.occurred_from is not None:
            results = [
                audit_log for audit_log in results if audit_log.occurred_at >= filters.occurred_from
            ]
        if filters.occurred_to is not None:
            results = [
                audit_log for audit_log in results if audit_log.occurred_at <= filters.occurred_to
            ]

        return sorted(
            results,
            key=lambda audit_log: (audit_log.occurred_at, audit_log.id),
            reverse=True,
        )[: filters.limit]


def build_authenticated_request_context(
    *,
    api_route: str = "/test",
    http_method: str = "POST",
    origin_path: str | None = "/test",
) -> AuthenticatedRequestContext:
    return AuthenticatedRequestContext(
        current_user=CurrentUser(
            sub="auth0|manager-1",
            email="manager@example.edu",
            name="Morgan Manager",
            email_verified=True,
        ),
        request_id="request-1",
        api_route=api_route,
        http_method=http_method,
        origin_path=origin_path,
    )


def build_audit_log(
    *,
    audit_id: str,
    occurred_at: datetime | None = None,
    action: str = "create",
    resource_type: str = "club",
    resource_id: str = "club-1",
    resource_label: str | None = "Chess Club",
) -> AuditLog:
    return AuditLog(
        id=audit_id,
        occurred_at=occurred_at or datetime.now(UTC),
        actor_sub="auth0|manager-1",
        actor_email="manager@example.edu",
        actor_name="Morgan Manager",
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_label=resource_label,
        api_route="/clubs/",
        http_method="POST",
        origin_path="/clubs",
        request_id=f"request-{audit_id}",
        summary_json={"status": "active"},
    )
