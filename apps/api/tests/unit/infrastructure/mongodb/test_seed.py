import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.mongodb.client import MongoDBClient
from src.infrastructure.mongodb.seed import DEFAULT_JOIN_REQUESTS, seed
from src.infrastructure.postgres.client import PostgresClient


class MongoDBSeedTests(unittest.TestCase):
    def _build_clients(self) -> tuple[MagicMock, MagicMock, MagicMock, MagicMock]:
        mongodb_client = MagicMock(spec=MongoDBClient)
        postgres_client = MagicMock(spec=PostgresClient)
        database = MagicMock()
        collection = MagicMock()
        session = MagicMock()

        mongodb_client.get_database.return_value = database
        database.__getitem__.return_value = collection
        postgres_client.create_session.return_value.__enter__.return_value = session

        return mongodb_client, postgres_client, collection, session

    def test_seed_inserts_join_requests_when_collection_is_empty(self) -> None:
        mongodb_client, postgres_client, collection, session = self._build_clients()
        collection.count_documents.return_value = 0
        organization = SimpleNamespace(id="org-123")
        club = SimpleNamespace(id="club-123")
        session.query.return_value.filter.return_value.one_or_none.side_effect = [
            organization,
            club,
        ]

        seeded = seed(mongodb_client=mongodb_client, postgres_client=postgres_client)

        self.assertTrue(seeded)
        collection.insert_many.assert_called_once()
        inserted_documents = collection.insert_many.call_args.args[0]
        self.assertEqual(len(inserted_documents), len(DEFAULT_JOIN_REQUESTS))
        self.assertTrue(all(doc["organizationId"] == organization.id for doc in inserted_documents))
        self.assertTrue(all(doc["clubId"] == club.id for doc in inserted_documents))

    def test_seed_skips_when_join_requests_already_contains_documents(self) -> None:
        mongodb_client, postgres_client, collection, session = self._build_clients()
        collection.count_documents.return_value = 1

        seeded = seed(mongodb_client=mongodb_client, postgres_client=postgres_client)

        self.assertFalse(seeded)
        session.query.assert_not_called()
        collection.insert_many.assert_not_called()

    def test_seed_skips_when_baseline_organization_is_missing(self) -> None:
        mongodb_client, postgres_client, collection, session = self._build_clients()
        collection.count_documents.return_value = 0
        session.query.return_value.filter.return_value.one_or_none.return_value = None

        seeded = seed(mongodb_client=mongodb_client, postgres_client=postgres_client)

        self.assertFalse(seeded)
        collection.insert_many.assert_not_called()

    def test_seed_skips_when_baseline_club_is_missing(self) -> None:
        mongodb_client, postgres_client, collection, session = self._build_clients()
        collection.count_documents.return_value = 0
        organization = SimpleNamespace(id="org-123")
        session.query.return_value.filter.return_value.one_or_none.side_effect = [
            organization,
            None,
        ]

        seeded = seed(mongodb_client=mongodb_client, postgres_client=postgres_client)

        self.assertFalse(seeded)
        collection.insert_many.assert_not_called()

    @patch("src.infrastructure.mongodb.seed.MongoDBClient")
    @patch("src.infrastructure.mongodb.seed.PostgresClient")
    @patch("src.infrastructure.mongodb.seed.get_settings")
    def test_seed_uses_configured_clients_when_none_are_supplied(
        self,
        mock_get_settings,
        mock_postgres_client,
        mock_mongodb_client,
    ) -> None:
        mock_get_settings.return_value.mongodb.url = "mongodb://example"
        mock_get_settings.return_value.postgres.url = "postgresql://example"
        database = MagicMock()
        collection = MagicMock()
        collection.count_documents.return_value = 1
        database.__getitem__.return_value = collection
        mock_mongodb_client.return_value.get_database.return_value = database

        seed()

        mock_mongodb_client.assert_called_once_with(database_url="mongodb://example")
        mock_postgres_client.assert_called_once_with(dsn="postgresql://example")
