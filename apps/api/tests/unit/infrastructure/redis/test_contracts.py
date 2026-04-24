import unittest
from dataclasses import asdict
from unittest.mock import Mock, patch
from uuid import UUID

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
from src.infrastructure.redis.caches.dashboard import RedisDashboardSummaryCache
from src.infrastructure.redis.client import RedisClient
from src.infrastructure.redis.sessions.session_store import RedisAuthSessionStore
from src.modules.auth.application.ports.auth_session_store import (
    AuthSessionRecord,
    AuthSessionStore,
)
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.domain.entities import Club
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.domain.models import (
    DashboardOverview,
    DashboardOverviewActivity,
    DashboardOverviewClubSummary,
    DashboardOverviewMetrics,
    DashboardOverviewScope,
    DashboardSummary,
)


class RedisAdapterContractTests(unittest.TestCase):
    def test_club_summary_cache_matches_port(self) -> None:
        mock_client = Mock(spec=RedisClient)
        club = Club(
            id="club-1",
            organization_id="org-1",
            slug="chess-club",
            name="Chess Club",
            description="Strategy and tournaments.",
            status="active",
        )

        mock_client.get_json.return_value = [
            {
                "id": "club-1",
                "organization_id": "org-1",
                "slug": "chess-club",
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

    def test_dashboard_summary_cache_matches_port(self) -> None:
        mock_client = Mock(spec=RedisClient)
        summary = DashboardSummary(
            club_id="club-1",
            total_members=9,
            total_events=2,
            total_announcements=4,
        )
        overview = DashboardOverview(
            scope=DashboardOverviewScope(
                organization_id="org-1",
                primary_role="club_manager",
                club_ids=("club-1",),
            ),
            metrics=DashboardOverviewMetrics(
                accessible_club_count=1,
                active_club_count=1,
                unique_member_count=9,
                pending_membership_count=1,
                upcoming_event_count=2,
                announcement_count=4,
                multi_club_member_count=0,
            ),
            clubs=(
                DashboardOverviewClubSummary(
                    id="club-1",
                    organization_id="org-1",
                    slug="chess-club",
                    name="Chess Club",
                    description="Strategy and tournaments.",
                    status="active",
                    member_count=9,
                    manager_name="Alex Smith",
                    next_event_at="2026-05-01T18:00:00+00:00",
                ),
            ),
            recent_activity=(
                DashboardOverviewActivity(
                    id="event-1",
                    club_id="club-1",
                    club_slug="chess-club",
                    club_name="Chess Club",
                    type="event",
                    title="Spring Open",
                    description="Student Center",
                    timestamp="2026-04-24T18:00:00+00:00",
                ),
            ),
        )
        mock_client.get_json.return_value = asdict(summary)
        mock_client.ttl.return_value = 42
        mock_client.get_int.side_effect = [5, 4, 1, 2, 0]

        cache = RedisDashboardSummaryCache(mock_client)

        self.assertIsInstance(cache, DashboardSummaryCache)
        self.assertEqual(cache.get("club-1"), summary)

        cache.set("club-1", summary)
        cache.delete("club-1")
        analytics = cache.get_analytics("club-1")
        mock_client.get_json.return_value = asdict(overview)
        cached_overview = cache.get_overview(
            organization_id="org-1",
            primary_role="club_manager",
            club_ids=("club-1",),
        )
        cache.set_overview(
            organization_id="org-1",
            primary_role="club_manager",
            club_ids=("club-1",),
            overview=overview,
        )

        self.assertEqual(analytics.status, "warm")
        self.assertTrue(analytics.cache_present)
        self.assertEqual(analytics.request_count, 5)
        self.assertEqual(cached_overview.scope.club_ids, ("club-1",))

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
