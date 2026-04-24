import unittest
from unittest.mock import patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.repositories.clubs import PostgresClubRepository
from src.infrastructure.postgres.unit_of_work import (
    DefaultPostgresUnitOfWork,
    PostgresUnitOfWork,
)
from src.modules.clubs.application.ports.club_repository import ClubRepository


class PostgresAdapterContractTests(unittest.TestCase):
    def test_postgres_club_repository_matches_port(self) -> None:
        repository = PostgresClubRepository(PostgresClient(dsn="postgresql://example"))

        self.assertIsInstance(repository, ClubRepository)

    @patch("src.infrastructure.postgres.client.create_engine")
    def test_postgres_client_normalizes_dsn_for_sqlalchemy(self, mock_create_engine) -> None:
        mock_create_engine.return_value = object()

        client = PostgresClient(dsn="postgresql://example")
        client.get_engine()

        mock_create_engine.assert_called_once_with(
            "postgresql+psycopg://example",
            future=True,
        )

    def test_unit_of_work_exposes_relational_contract(self) -> None:
        unit_of_work = DefaultPostgresUnitOfWork(PostgresClient(dsn="postgresql://example"))

        self.assertIsInstance(unit_of_work, PostgresUnitOfWork)
