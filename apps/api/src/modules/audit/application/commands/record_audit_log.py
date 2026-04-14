from dataclasses import dataclass

from src.modules.audit.application.models import AuditLogWrite
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.domain.entities import AuditLog


@dataclass(frozen=True)
class RecordAuditLog:
    repository: AuditLogRepository

    def execute(self, audit_log: AuditLogWrite) -> AuditLog:
        return self.repository.create_audit_log(audit_log)
