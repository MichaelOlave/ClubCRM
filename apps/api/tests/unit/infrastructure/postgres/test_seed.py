import unittest
from unittest.mock import MagicMock, patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.seed import seed


class PostgresSeedTests(unittest.TestCase):
    def _build_client_and_session(self) -> tuple[MagicMock, MagicMock]:
        client = MagicMock(spec=PostgresClient)
        session = MagicMock()
        client.create_session.return_value.__enter__.return_value = session
        return client, session

    def test_seed_inserts_records_when_database_is_empty(self) -> None:
        client, session = self._build_client_and_session()
        session.scalar.return_value = None

        seeded = seed(client=client)

        self.assertTrue(seeded)
        session.add.assert_called()
        session.add_all.assert_called()
        session.commit.assert_called_once()

    def test_seed_skips_when_database_already_contains_organizations(self) -> None:
        client, session = self._build_client_and_session()
        session.scalar.return_value = "org-123"

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

        seed()

        mock_postgres_client.assert_called_once_with(dsn="postgresql://example")
