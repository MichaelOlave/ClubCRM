# ruff: noqa: E402,I001
import unittest
from datetime import UTC, datetime

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.modules.audit.application.commands.record_audit_log import RecordAuditLog
from src.modules.audit.application.models import AuditLogFilters, AuditLogWrite
from src.modules.audit.application.queries.list_audit_logs import ListAuditLogs
from tests.audit_fakes import FakeAuditLogRepository, build_audit_log


class AuditApplicationTests(unittest.TestCase):
    def test_record_audit_log_persists_entry_through_repository(self) -> None:
        repository = FakeAuditLogRepository()
        occurred_at = datetime(2026, 4, 14, 10, 0, tzinfo=UTC)

        created = RecordAuditLog(repository=repository).execute(
            AuditLogWrite(
                occurred_at=occurred_at,
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

        self.assertEqual(created.id, "audit-1")
        self.assertEqual(created.resource_label, "Chess Club")
        self.assertEqual(len(repository.audit_logs), 1)

    def test_list_audit_logs_clamps_limit_and_returns_newest_first(self) -> None:
        repository = FakeAuditLogRepository()
        repository.audit_logs = [
            build_audit_log(
                audit_id="audit-1",
                occurred_at=datetime(2026, 4, 14, 9, 0, tzinfo=UTC),
                action="create",
                resource_type="club",
                resource_id="club-1",
            ),
            build_audit_log(
                audit_id="audit-2",
                occurred_at=datetime(2026, 4, 14, 11, 0, tzinfo=UTC),
                action="update",
                resource_type="member",
                resource_id="member-1",
                resource_label="Morgan Manager",
            ),
        ]

        results = ListAuditLogs(repository=repository).execute(
            AuditLogFilters(limit=999, action="update")
        )

        self.assertEqual(len(results.items), 1)
        self.assertEqual(results.items[0].id, "audit-2")
        self.assertEqual(results.page, 1)
        self.assertFalse(results.has_next)

    def test_list_audit_logs_returns_has_next_for_following_page(self) -> None:
        repository = FakeAuditLogRepository()
        repository.audit_logs = [
            build_audit_log(
                audit_id="audit-1",
                occurred_at=datetime(2026, 4, 14, 9, 0, tzinfo=UTC),
            ),
            build_audit_log(
                audit_id="audit-2",
                occurred_at=datetime(2026, 4, 14, 10, 0, tzinfo=UTC),
            ),
            build_audit_log(
                audit_id="audit-3",
                occurred_at=datetime(2026, 4, 14, 11, 0, tzinfo=UTC),
            ),
        ]

        results = ListAuditLogs(repository=repository).execute(AuditLogFilters(limit=2))

        self.assertEqual([audit_log.id for audit_log in results.items], ["audit-3", "audit-2"])
        self.assertTrue(results.has_next)
