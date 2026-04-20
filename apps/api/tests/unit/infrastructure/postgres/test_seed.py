import unittest
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import (
    AdminUserModel,
    AuditLogModel,
    AuthUserBindingModel,
    ClubManagerRoleModel,
    MemberModel,
    MembershipModel,
)
from src.infrastructure.postgres.seed import DEFAULT_ADMIN_EMAILS, seed


class PostgresSeedTests(unittest.TestCase):
    def _build_client_and_session(self) -> tuple[MagicMock, MagicMock]:
        client = MagicMock(spec=PostgresClient)
        session = MagicMock()
        client.create_session.return_value.__enter__.return_value = session
        return client, session

    def test_seed_inserts_records_when_database_is_empty(self) -> None:
        client, session = self._build_client_and_session()
        session.scalar.return_value = None
        existing_admins_result = MagicMock()
        existing_admins_result.scalars.return_value.all.return_value = []
        bound_admin_result = MagicMock()
        bound_admin_result.scalar_one_or_none.return_value = SimpleNamespace(
            id="admin-123",
            email="developer@clubcrm.local",
        )
        missing_binding_result = MagicMock()
        missing_binding_result.scalar_one_or_none.return_value = None
        missing_bound_admin_result = MagicMock()
        missing_bound_admin_result.scalar_one_or_none.return_value = None
        empty_audit_result = MagicMock()
        empty_audit_result.scalar_one_or_none.return_value = None
        session.execute.side_effect = [
            existing_admins_result,
            bound_admin_result,
            missing_binding_result,
            empty_audit_result,
        ]

        seeded = seed(client=client)

        self.assertTrue(seeded)
        session.add.assert_called()
        session.add_all.assert_called()
        session.commit.assert_called_once()
        seeded_admin_emails = [
            model.email
            for call in session.add_all.call_args_list
            for model in call.args[0]
            if isinstance(model, AdminUserModel)
        ]
        self.assertCountEqual(seeded_admin_emails, DEFAULT_ADMIN_EMAILS)
        seeded_member_emails = [
            model.email
            for call in session.add_all.call_args_list
            for model in call.args[0]
            if isinstance(model, MemberModel)
        ]
        self.assertIn("club-manager@clubcrm.local", seeded_member_emails)
        seeded_manager_grants = [
            model
            for call in session.add_all.call_args_list
            for model in call.args[0]
            if isinstance(model, ClubManagerRoleModel)
        ]
        self.assertEqual(len(seeded_manager_grants), 1)
        seeded_club_manager_memberships = [
            model
            for call in session.add_all.call_args_list
            for model in call.args[0]
            if isinstance(model, MembershipModel)
            and model.member_id == seeded_manager_grants[0].member_id
            and model.club_id == seeded_manager_grants[0].club_id
        ]
        self.assertEqual(len(seeded_club_manager_memberships), 1)
        seeded_auth_bindings = [
            model
            for call in session.add_all.call_args_list
            for model in call.args[0]
            if isinstance(model, AuthUserBindingModel)
        ]
        self.assertEqual(len(seeded_auth_bindings), 0)
        seeded_audit_logs = [
            model
            for call in session.add_all.call_args_list
            for model in call.args[0]
            if isinstance(model, AuditLogModel)
        ]
        self.assertEqual(len(seeded_audit_logs), 0)
        added_auth_bindings = [
            call.args[0]
            for call in session.add.call_args_list
            if isinstance(call.args[0], AuthUserBindingModel)
        ]
        self.assertEqual(len(added_auth_bindings), 1)
        added_audit_logs = [
            call.args[0]
            for call in session.add.call_args_list
            if isinstance(call.args[0], AuditLogModel)
        ]
        self.assertEqual(len(added_audit_logs), 1)

    def test_seed_backfills_default_admin_users_for_existing_champlain_org(self) -> None:
        client, session = self._build_client_and_session()
        session.scalar.return_value = "org-123"

        seed_org_result = MagicMock()
        seed_org_result.scalar_one_or_none.return_value = SimpleNamespace(id="org-123")
        existing_admins_result = MagicMock()
        existing_admins_result.scalars.return_value.all.return_value = []
        club_result = MagicMock()
        club_result.scalar_one_or_none.return_value = SimpleNamespace(id="club-123")
        bound_admin_result = MagicMock()
        bound_admin_result.scalar_one_or_none.return_value = SimpleNamespace(
            id="admin-123",
            email="developer@clubcrm.local",
        )
        missing_binding_result = MagicMock()
        missing_binding_result.scalar_one_or_none.return_value = None
        empty_audit_result = MagicMock()
        empty_audit_result.scalar_one_or_none.return_value = None
        stale_event_result = MagicMock()
        stale_event_result.scalar_one_or_none.return_value = SimpleNamespace(
            starts_at=datetime.now(UTC) - timedelta(days=1),
            ends_at=None,
        )
        session.execute.side_effect = [
            seed_org_result,
            existing_admins_result,
            club_result,
            bound_admin_result,
            missing_binding_result,
            empty_audit_result,
            stale_event_result,
        ]

        seeded = seed(client=client)

        self.assertTrue(seeded)
        session.commit.assert_called_once()
        seeded_admin_emails = [
            model.email
            for model in session.add_all.call_args.args[0]
            if isinstance(model, AdminUserModel)
        ]
        self.assertCountEqual(seeded_admin_emails, DEFAULT_ADMIN_EMAILS)
        added_auth_bindings = [
            call.args[0]
            for call in session.add.call_args_list
            if isinstance(call.args[0], AuthUserBindingModel)
        ]
        self.assertEqual(len(added_auth_bindings), 1)
        added_audit_logs = [
            call.args[0]
            for call in session.add.call_args_list
            if isinstance(call.args[0], AuditLogModel)
        ]
        self.assertEqual(len(added_audit_logs), 1)

    def test_seed_skips_when_database_already_contains_organizations(self) -> None:
        client, session = self._build_client_and_session()
        session.scalar.return_value = "org-123"
        seed_org_result = MagicMock()
        seed_org_result.scalar_one_or_none.return_value = None
        session.execute.return_value = seed_org_result

        seeded = seed(client=client)

        self.assertFalse(seeded)
        session.add.assert_not_called()
        session.add_all.assert_not_called()
        session.commit.assert_not_called()

    @patch("src.infrastructure.postgres.seed.PostgresClient")
    @patch("src.infrastructure.postgres.seed.get_settings")
    def test_seed_uses_configured_postgres_client_when_none_is_supplied(
        self,
        mock_get_settings,
        mock_postgres_client,
    ) -> None:
        mock_get_settings.return_value.postgres.url = "postgresql://example"
        session = MagicMock()
        mock_postgres_client.return_value.create_session.return_value.__enter__.return_value = (
            session
        )
        session.scalar.return_value = "org-123"
        seed_org_result = MagicMock()
        seed_org_result.scalar_one_or_none.return_value = SimpleNamespace(id="org-123")
        club_result = MagicMock()
        club_result.scalar_one_or_none.return_value = SimpleNamespace(id="club-123")
        missing_bound_admin_result = MagicMock()
        missing_bound_admin_result.scalar_one_or_none.return_value = None
        empty_audit_result = MagicMock()
        empty_audit_result.scalar_one_or_none.return_value = None
        future_event_result = MagicMock()
        future_event_result.scalar_one_or_none.return_value = SimpleNamespace(
            starts_at=datetime.now(UTC) + timedelta(days=1),
            ends_at=None,
        )
        session.execute.side_effect = [
            seed_org_result,
            club_result,
            missing_bound_admin_result,
            empty_audit_result,
            future_event_result,
        ]

        seed()

        mock_postgres_client.assert_called_once_with(dsn="postgresql://example")
