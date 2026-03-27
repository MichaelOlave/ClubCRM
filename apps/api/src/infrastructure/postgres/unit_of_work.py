from abc import ABC, abstractmethod
from types import TracebackType

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.repositories.clubs import PostgresClubRepository
from src.modules.clubs.application.ports.club_repository import ClubRepository


class PostgresUnitOfWork(ABC):
    club_repository: ClubRepository

    @abstractmethod
    def __enter__(self) -> "PostgresUnitOfWork":
        """Start a transactional unit of work."""

    @abstractmethod
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        """Close a transactional unit of work."""

    @abstractmethod
    def commit(self) -> None:
        """Persist transaction changes."""

    @abstractmethod
    def rollback(self) -> None:
        """Discard transaction changes."""


class DefaultPostgresUnitOfWork(PostgresUnitOfWork):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client
        self.club_repository = PostgresClubRepository(client=client)

    def __enter__(self) -> "DefaultPostgresUnitOfWork":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        _ = (exc_value, traceback)

        if exc_type is not None:
            self.rollback()

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None
