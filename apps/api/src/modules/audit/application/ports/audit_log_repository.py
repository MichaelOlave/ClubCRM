from abc import ABC, abstractmethod

from src.modules.audit.application.models import AuditLogFilters, AuditLogWrite
from src.modules.audit.domain.entities import AuditLog


class AuditLogRepository(ABC):
    @abstractmethod
    def create_audit_log(self, audit_log: AuditLogWrite) -> AuditLog:
        """Persist a new audit log entry."""

    @abstractmethod
    def list_audit_logs(self, filters: AuditLogFilters) -> list[AuditLog]:
        """Return audit log entries ordered from newest to oldest."""
