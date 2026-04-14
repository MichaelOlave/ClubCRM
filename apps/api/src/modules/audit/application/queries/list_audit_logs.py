from dataclasses import dataclass, replace

from src.modules.audit.application.models import AuditLogFilters
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.domain.entities import AuditLog


@dataclass(frozen=True)
class ListAuditLogs:
    repository: AuditLogRepository

    def execute(self, filters: AuditLogFilters) -> list[AuditLog]:
        normalized_limit = max(1, min(filters.limit, 100))
        return self.repository.list_audit_logs(replace(filters, limit=normalized_limit))
