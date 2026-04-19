from sqlalchemy import or_, select

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import AuditLogModel
from src.modules.audit.application.models import AuditLogFilters, AuditLogWrite
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.audit.domain.entities import AuditLog


class PostgresAuditLogRepository(AuditLogRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def create_audit_log(self, audit_log: AuditLogWrite) -> AuditLog:
        with self.client.create_session() as session:
            row = AuditLogModel(
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
            session.add(row)
            session.commit()
            session.refresh(row)
            return self._to_domain(row)

    def list_audit_logs(self, filters: AuditLogFilters) -> list[AuditLog]:
        with self.client.create_session() as session:
            statement = select(AuditLogModel)

            if filters.action is not None:
                statement = statement.where(AuditLogModel.action == filters.action)
            if filters.resource_type is not None:
                statement = statement.where(AuditLogModel.resource_type == filters.resource_type)
            if filters.resource_id is not None:
                statement = statement.where(AuditLogModel.resource_id == filters.resource_id)
            if filters.actor_query is not None:
                actor_query = f"%{filters.actor_query.strip()}%"
                statement = statement.where(
                    or_(
                        AuditLogModel.actor_sub.ilike(actor_query),
                        AuditLogModel.actor_email.ilike(actor_query),
                        AuditLogModel.actor_name.ilike(actor_query),
                    )
                )
            if filters.occurred_from is not None:
                statement = statement.where(AuditLogModel.occurred_at >= filters.occurred_from)
            if filters.occurred_to is not None:
                statement = statement.where(AuditLogModel.occurred_at <= filters.occurred_to)

            rows = (
                session.execute(
                    statement.order_by(
                        AuditLogModel.occurred_at.desc(), AuditLogModel.id.desc()
                    ).limit(filters.limit)
                )
                .scalars()
                .all()
            )
            return [self._to_domain(row) for row in rows]

    @staticmethod
    def _to_domain(row: AuditLogModel) -> AuditLog:
        return AuditLog(
            id=row.id,
            occurred_at=row.occurred_at,
            actor_sub=row.actor_sub,
            actor_email=row.actor_email,
            actor_name=row.actor_name,
            action=row.action,
            resource_type=row.resource_type,
            resource_id=row.resource_id,
            resource_label=row.resource_label,
            api_route=row.api_route,
            http_method=row.http_method,
            origin_path=row.origin_path,
            request_id=row.request_id,
            summary_json=row.summary_json or {},
        )
