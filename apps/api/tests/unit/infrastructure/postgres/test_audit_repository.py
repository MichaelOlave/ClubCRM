# ruff: noqa: E402,I001
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models import tables  # noqa: F401
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.repositories.audit import PostgresAuditLogRepository
from src.modules.audit.application.models import AuditLogFilters, AuditLogWrite
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository


def make_repository() -> tuple[PostgresAuditLogRepository, tempfile.TemporaryDirectory[str]]:
    tmp_dir = tempfile.TemporaryDirectory()
    db_path = Path(tmp_dir.name) / "audit.db"
    client = PostgresClient(dsn=f"sqlite+pysqlite:///{db_path}")
    repository = PostgresAuditLogRepository(client=client)
    Base.metadata.create_all(repository.client.get_engine())
    return repository, tmp_dir


class PostgresAuditLogRepositoryTests(unittest.TestCase):
    def test_repository_matches_audit_port(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)

        self.assertIsInstance(repository, AuditLogRepository)

    def test_repository_persists_filterable_newest_first_audit_logs(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)

        repository.create_audit_log(
            AuditLogWrite(
                occurred_at=datetime(2026, 4, 14, 9, 0, tzinfo=UTC),
                actor_sub="auth0|manager-1",
                actor_email="manager@example.edu",
                actor_name="Morgan Manager",
                action="create",
                resource_type="club",
                resource_id="club-1",
                resource_label="Chess Club",
                api_route="/clubs/",
                http_method="POST",
                origin_path="/clubs",
                request_id="request-1",
                summary_json={"status": "active"},
            )
        )
        newer = repository.create_audit_log(
            AuditLogWrite(
                occurred_at=datetime(2026, 4, 14, 10, 0, tzinfo=UTC),
                actor_sub="auth0|manager-1",
                actor_email="manager@example.edu",
                actor_name="Morgan Manager",
                action="update",
                resource_type="member",
                resource_id="member-1",
                resource_label="Morgan Manager",
                api_route="/members/{member_id}",
                http_method="PATCH",
                origin_path="/members/member-1",
                request_id="request-2",
                summary_json={"changed_fields": ["last_name"]},
            )
        )

        filtered = repository.list_audit_logs(
            AuditLogFilters(action="update", resource_type="member", actor_query="manager", limit=5)
        )

        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0].id, newer.id)

        newest_first = repository.list_audit_logs(AuditLogFilters(limit=5))
        self.assertEqual([audit_log.action for audit_log in newest_first], ["update", "create"])

        paged = repository.list_audit_logs(AuditLogFilters(limit=1, offset=1))
        self.assertEqual([audit_log.action for audit_log in paged], ["create"])
