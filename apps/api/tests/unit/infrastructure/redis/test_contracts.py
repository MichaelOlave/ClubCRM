import unittest
from dataclasses import asdict
from uuid import UUID
from unittest.mock import Mock, patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
from src.infrastructure.redis.client import RedisClient
from src.infrastructure.redis.sessions.session_store import RedisAuthSessionStore
from src.modules.auth.application.ports.auth_session_store import (
    AuthSessionRecord,
    AuthSessionStore,
)
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.domain.entities import Club


class RedisAdapterContractTests(unittest.TestCase):
    def test_club_summary_cache_matches_port(self) -> None:
        mock_client = Mock(spec=RedisClient)
        club = Club(
            id="club-1",
            organization_id="org-1",
            name="Chess Club",
            description="Strategy and tournaments.",
            status="active",
        )

        mock_client.get_json.return_value = [
            {
                "id": "club-1",
                "organization_id": "org-1",
                "name": "Chess Club",
                "description": "Strategy and tournaments.",
                "status": "active",
            }
        ]

        cache = RedisClubSummaryCache(mock_client)

        self.assertIsInstance(cache, ClubSummaryCache)
        self.assertEqual(cache.get("org-1"), [club])

        cache.set("org-1", [club])
        mock_client.set_json.assert_called_once()

    @patch(
        "src.infrastructure.redis.sessions.session_store.uuid4",
        return_value=UUID("12345678-1234-5678-1234-567812345678"),
    )
    def test_auth_session_store_create_uses_the_auth_port(self, _mock_uuid4) -> None:
        mock_client = Mock(spec=RedisClient)
        store = RedisAuthSessionStore(mock_client, ttl_seconds=43200)
        record = AuthSessionRecord(
            user={"sub": "auth0|user-123"},
            csrf_token="csrf-token",
            auth_flow_state=None,
            created_at="2026-04-04T00:00:00+00:00",
        )

        session_id = store.create(record)

        self.assertIsInstance(store, AuthSessionStore)
        self.assertEqual(session_id, "12345678-1234-5678-1234-567812345678")
        mock_client.set_json.assert_called_once_with(
            "clubcrm:auth-session:12345678-1234-5678-1234-567812345678",
            asdict(record),
            ttl_seconds=43200,
        )

    def test_auth_session_store_reads_and_writes_auth_records(self) -> None:
        mock_client = Mock(spec=RedisClient)
        record = AuthSessionRecord(
            user={"sub": "auth0|user-123"},
            csrf_token="csrf-token",
            auth_flow_state="state-123",
            created_at="2026-04-04T00:00:00+00:00",
        )
        mock_client.get_json.return_value = asdict(record)

        store = RedisAuthSessionStore(mock_client, ttl_seconds=43200)

        self.assertEqual(store.get("session-123"), record)

        store.save("session-123", record)
        mock_client.set_json.assert_called_once_with(
            "clubcrm:auth-session:session-123",
            asdict(record),
            ttl_seconds=43200,
        )

    def test_auth_session_store_can_delete_and_touch_records(self) -> None:
        mock_client = Mock(spec=RedisClient)
        store = RedisAuthSessionStore(mock_client, ttl_seconds=43200)

        store.delete("session-123")
        store.touch("session-123")

        mock_client.delete.assert_called_once_with("clubcrm:auth-session:session-123")
        mock_client.expire.assert_called_once_with("clubcrm:auth-session:session-123", 43200)
