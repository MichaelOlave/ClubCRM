from dataclasses import dataclass, replace

from src.modules.audit.application.models import AuditLogFilters, AuditLogPage
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository


@dataclass(frozen=True)
class ListAuditLogs:
    repository: AuditLogRepository

    def execute(self, filters: AuditLogFilters) -> AuditLogPage:
        normalized_limit = max(1, min(filters.limit, 100))
        normalized_offset = max(filters.offset, 0)
        page = (normalized_offset // normalized_limit) + 1
        results = self.repository.list_audit_logs(
            replace(filters, limit=normalized_limit + 1, offset=normalized_offset)
        )

        return AuditLogPage(
            items=results[:normalized_limit],
            page=page,
            page_size=normalized_limit,
            has_next=len(results) > normalized_limit,
        )
