# ruff: noqa: E402,I001
import tempfile
import unittest
from pathlib import Path

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models import tables  # noqa: F401
from src.infrastructure.postgres.models.base import Base
from src.infrastructure.postgres.models.tables import (
    AdminUserModel,
    AuthUserBindingModel,
    OrganizationModel,
)
from src.infrastructure.postgres.repositories.auth import PostgresAuthorizationRepository


def make_repository() -> tuple[PostgresAuthorizationRepository, tempfile.TemporaryDirectory[str]]:
    tmp_dir = tempfile.TemporaryDirectory()
    db_path = Path(tmp_dir.name) / "auth.db"
    client = PostgresClient(dsn=f"sqlite+pysqlite:///{db_path}")
    repository = PostgresAuthorizationRepository(client=client)
    Base.metadata.create_all(repository.client.get_engine())
    return repository, tmp_dir


class PostgresAuthorizationRepositoryTests(unittest.TestCase):
    def test_resolve_access_reuses_existing_binding_for_same_admin_identity(self) -> None:
        repository, tmp_dir = make_repository()
        self.addCleanup(tmp_dir.cleanup)

        with repository.client.create_session() as session:
            organization = OrganizationModel(id="org-1", name="Champlain College")
            admin_user = AdminUserModel(
                id="admin-1",
                organization_id=organization.id,
                email="developer@clubcrm.local",
                is_active=True,
            )
            existing_binding = AuthUserBindingModel(
                id="binding-1",
                provider_subject="auth0|admin-1",
                email=admin_user.email,
                admin_user_id=admin_user.id,
            )
            session.add_all([organization, admin_user, existing_binding])
            session.commit()

        resolution = repository.resolve_access_for_identity(
            provider_subject="dev-auth-bypass-user",
            email="developer@clubcrm.local",
        )

        self.assertEqual(resolution.admin_user_id, "admin-1")
        self.assertIsNone(resolution.member_id)
        self.assertIsNotNone(resolution.access)
        self.assertEqual(
            resolution.access.organization_id if resolution.access is not None else None,
            "org-1",
        )

        with repository.client.create_session() as session:
            bindings = session.query(AuthUserBindingModel).all()

        self.assertEqual(len(bindings), 1)
        self.assertEqual(bindings[0].provider_subject, "dev-auth-bypass-user")
        self.assertEqual(bindings[0].admin_user_id, "admin-1")
