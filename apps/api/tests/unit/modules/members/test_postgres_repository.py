# ruff: noqa: E402,I001
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.models.tables import OrganizationModel
from src.infrastructure.postgres.repositories.members import PostgresMemberRepository
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository


class PostgresMemberRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)

        self.database_path = Path(self.tempdir.name) / "members.db"
        self.dsn = f"sqlite+pysqlite:///{self.database_path}"
        self.engine = create_engine(self.dsn, future=True)
        Base.metadata.create_all(self.engine)

        with Session(self.engine) as session:
            session.add(
                OrganizationModel(
                    id="org-1",
                    name="Champlain College",
                )
            )
            session.commit()

    def _repository(self) -> PostgresMemberRepository:
        return PostgresMemberRepository(PostgresClient(dsn=self.dsn))

    def test_postgres_member_repository_matches_port(self) -> None:
        repository = self._repository()

        self.assertIsInstance(repository, MemberRepository)

    def test_repository_supports_member_crud(self) -> None:
        repository = self._repository()

        created = repository.create_member(
            CreateMemberInput(
                organization_id="org-1",
                first_name="Taylor",
                last_name="Student",
                email="taylor@example.edu",
                student_id="S001",
            )
        )

        listed = repository.list_members("org-1")
        fetched = repository.get_member(created.id)
        updated = repository.update_member(
            created.id,
            UpdateMemberInput(last_name="Researcher", student_id="S002"),
        )
        deleted = repository.delete_member(created.id)

        self.assertEqual(created.organization_id, "org-1")
        self.assertEqual(len(listed), 1)
        self.assertIsNotNone(fetched)
        self.assertIsNotNone(updated)
        self.assertEqual(updated.last_name if updated is not None else None, "Researcher")
        self.assertTrue(deleted)
        self.assertIsNone(repository.get_member(created.id))
