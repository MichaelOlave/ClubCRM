import unittest

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

        with self.assertRaises(NotImplementedError):
            repository.list_clubs("org-1")

    def test_unit_of_work_exposes_relational_contract(self) -> None:
        unit_of_work = DefaultPostgresUnitOfWork(
            PostgresClient(dsn="postgresql://example")
        )

        self.assertIsInstance(unit_of_work, PostgresUnitOfWork)
