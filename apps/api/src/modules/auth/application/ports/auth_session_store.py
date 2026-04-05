from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AuthSessionRecord:
    user: dict[str, Any] | None
    csrf_token: str | None
    auth_flow_state: str | None
    created_at: str


class AuthSessionStore(ABC):
    @abstractmethod
    def create(self, record: AuthSessionRecord) -> str:
        """Create a new auth session and return its opaque session identifier."""

    @abstractmethod
    def get(self, session_id: str) -> AuthSessionRecord | None:
        """Return the auth session associated with the identifier if it exists."""

    @abstractmethod
    def save(self, session_id: str, record: AuthSessionRecord) -> None:
        """Persist a full auth session record under an existing identifier."""

    @abstractmethod
    def delete(self, session_id: str) -> None:
        """Delete the auth session associated with the identifier."""

    @abstractmethod
    def touch(self, session_id: str) -> None:
        """Refresh the auth session lifetime without mutating its payload."""
