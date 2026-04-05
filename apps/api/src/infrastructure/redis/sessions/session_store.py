from dataclasses import asdict
from uuid import uuid4

from src.infrastructure.redis.client import RedisClient
from src.modules.auth.application.ports.auth_session_store import (
    AuthSessionRecord,
    AuthSessionStore,
)


class RedisAuthSessionStore(AuthSessionStore):
    def __init__(self, client: RedisClient, ttl_seconds: int) -> None:
        self.client = client
        self.ttl_seconds = ttl_seconds

    def _key(self, session_id: str) -> str:
        return f"clubcrm:auth-session:{session_id}"

    def create(self, record: AuthSessionRecord) -> str:
        session_id = str(uuid4())
        self.save(session_id, record)
        return session_id

    def get(self, session_id: str) -> AuthSessionRecord | None:
        data = self.client.get_json(self._key(session_id))
        if not isinstance(data, dict):
            return None
        return AuthSessionRecord(**data)

    def save(self, session_id: str, record: AuthSessionRecord) -> None:
        self.client.set_json(
            self._key(session_id),
            asdict(record),
            ttl_seconds=self.ttl_seconds,
        )

    def delete(self, session_id: str) -> None:
        self.client.delete(self._key(session_id))

    def touch(self, session_id: str) -> None:
        self.client.expire(self._key(session_id), self.ttl_seconds)
