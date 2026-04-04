from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from uuid import uuid4

from src.infrastructure.redis.client import RedisClient


@dataclass(frozen=True)
class SessionData:
    user_id: str
    club_id: str
    role: str
    created_at: str


class RedisSessionStore:
    TTL_SECONDS = 1800

    def __init__(self, client: RedisClient) -> None:
        self.client = client

    def _key(self, session_id: str) -> str:
        return f"clubcrm:session:{session_id}"

    def create(self, user_id: str, club_id: str, role: str) -> str:
        session_id = str(uuid4())
        session = SessionData(
            user_id=user_id,
            club_id=club_id,
            role=role,
            created_at=datetime.now(UTC).isoformat(),
        )
        self.client.set_json(
            self._key(session_id),
            asdict(session),
            ttl_seconds=self.TTL_SECONDS,
        )
        return session_id

    def get(self, session_id: str) -> SessionData | None:
        data = self.client.get_json(self._key(session_id))
        if data is None:
            return None
        return SessionData(**data)

    def delete(self, session_id: str) -> None:
        self.client.delete(self._key(session_id))
