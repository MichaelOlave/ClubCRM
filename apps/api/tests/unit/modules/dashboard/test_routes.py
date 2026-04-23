import unittest
from types import ModuleType
import sys

from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from helpers import add_api_root_to_path

add_api_root_to_path()

pymongo_module = ModuleType("pymongo")
pymongo_database_module = ModuleType("pymongo.database")
pymongo_database_module.Database = object
pymongo_module.database = pymongo_database_module
pymongo_module.MongoClient = object
pymongo_module.ReturnDocument = ModuleType("ReturnDocument")
pymongo_module.ReturnDocument.AFTER = "after"
bson_module = ModuleType("bson")
bson_module.ObjectId = str
bson_errors_module = ModuleType("bson.errors")
bson_errors_module.InvalidId = ValueError
sys.modules.setdefault("pymongo", pymongo_module)
sys.modules.setdefault("pymongo.database", pymongo_database_module)
sys.modules.setdefault("bson", bson_module)
sys.modules.setdefault("bson.errors", bson_errors_module)

from src.bootstrap.dependencies import get_dashboard_repository, get_dashboard_summary_cache
from src.modules.auth.domain.entities import AppAccess
from src.modules.auth.presentation.http.dependencies import require_authorized_access
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.domain.models import (
    DashboardOverview,
    DashboardOverviewActivity,
    DashboardOverviewClubSummary,
    DashboardOverviewMetrics,
    DashboardOverviewScope,
    DashboardRedisAnalytics,
    DashboardSummary,
)
from src.modules.dashboard.presentation.http.routes import router


def build_org_admin_access() -> AppAccess:
    return AppAccess(
        primary_role="org_admin",
        organization_id="org-1",
        managed_club_ids=(),
    )


def build_club_manager_access() -> AppAccess:
    return AppAccess(
        primary_role="club_manager",
        organization_id="org-1",
        managed_club_ids=("club-2",),
    )


class FakeDashboardRepository(DashboardRepository):
    def get_summary(self, club_id: str) -> DashboardSummary | None:
        if club_id != "club-1":
            return None

        return DashboardSummary(
            club_id=club_id,
            total_members=18,
            total_events=4,
            total_announcements=7,
        )

    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
    ) -> DashboardOverview:
        if primary_role == "club_manager":
            return DashboardOverview(
                scope=DashboardOverviewScope(
                    organization_id=organization_id,
                    primary_role=primary_role,
                    club_ids=club_ids,
                ),
                metrics=DashboardOverviewMetrics(
                    accessible_club_count=1,
                    active_club_count=1,
                    unique_member_count=8,
                    pending_membership_count=2,
                    upcoming_event_count=1,
                    announcement_count=3,
                    multi_club_member_count=1,
                ),
                clubs=(
                    DashboardOverviewClubSummary(
                        id="club-2",
                        organization_id=organization_id,
                        slug="robotics-club",
                        name="Robotics Club",
                        description="Builds and competitions.",
                        status="active",
                        member_count=8,
                        manager_name=None,
                        next_event_at="2026-05-01T18:00:00+00:00",
                    ),
                ),
                recent_activity=(
                    DashboardOverviewActivity(
                        id="announcement-2",
                        club_id="club-2",
                        club_slug="robotics-club",
                        club_name="Robotics Club",
                        type="announcement",
                        title="Competition prep",
                        description="Bring your hardware kits.",
                        timestamp="2026-04-24T10:00:00+00:00",
                    ),
                ),
            )

        return DashboardOverview(
            scope=DashboardOverviewScope(
                organization_id=organization_id,
                primary_role=primary_role,
                club_ids=club_ids,
            ),
            metrics=DashboardOverviewMetrics(
                accessible_club_count=2,
                active_club_count=1,
                unique_member_count=18,
                pending_membership_count=3,
                upcoming_event_count=4,
                announcement_count=7,
                multi_club_member_count=5,
            ),
            clubs=(
                DashboardOverviewClubSummary(
                    id="club-1",
                    organization_id=organization_id,
                    slug="chess-club",
                    name="Chess Club",
                    description="Strategy and tournaments.",
                    status="active",
                    member_count=10,
                    manager_name="Alex Smith",
                    next_event_at="2026-04-30T18:00:00+00:00",
                ),
                DashboardOverviewClubSummary(
                    id="club-2",
                    organization_id=organization_id,
                    slug="robotics-club",
                    name="Robotics Club",
                    description="Builds and competitions.",
                    status="planning",
                    member_count=8,
                    manager_name=None,
                    next_event_at=None,
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
                    timestamp="2026-04-25T18:00:00+00:00",
                ),
            ),
        )


class FakeDashboardSummaryCache(DashboardSummaryCache):
    def __init__(self) -> None:
        self.values: dict[str, DashboardSummary] = {}
        self.overview_values: dict[str, DashboardOverview] = {}

    def _overview_key(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
    ) -> str:
        return f"{organization_id}:{primary_role}:{','.join(club_ids)}"

    def get(self, club_id: str) -> DashboardSummary | None:
        return self.values.get(club_id)

    def set(self, club_id: str, summary: DashboardSummary) -> None:
        self.values[club_id] = summary

    def delete(self, club_id: str) -> None:
        self.values.pop(club_id, None)

    def get_analytics(self, club_id: str) -> DashboardRedisAnalytics:
        return DashboardRedisAnalytics(
            club_id=club_id,
            cache_key=f"clubcrm:dashboard:summary:{club_id}",
            available=True,
            cache_present=club_id in self.values,
            ttl_seconds=72 if club_id in self.values else None,
            request_count=3,
            hit_count=2,
            miss_count=1,
            refresh_count=1,
            invalidation_count=0,
            hit_rate=2 / 3,
            status="warm" if club_id in self.values else "cold",
        )

    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
    ) -> DashboardOverview | None:
        return self.overview_values.get(
            self._overview_key(
                organization_id=organization_id,
                primary_role=primary_role,
                club_ids=club_ids,
            )
        )

    def set_overview(
        self,
        *,
        organization_id: str,
        primary_role: str,
        club_ids: tuple[str, ...],
        overview: DashboardOverview,
    ) -> None:
        self.overview_values[
            self._overview_key(
                organization_id=organization_id,
                primary_role=primary_role,
                club_ids=club_ids,
            )
        ] = overview


class DashboardRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeDashboardRepository()
        self.cache = FakeDashboardSummaryCache()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_dashboard_repository] = lambda: self.repository
        self.app.dependency_overrides[get_dashboard_summary_cache] = lambda: self.cache
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_dashboard_overview_route_returns_org_admin_summary(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access

        response = self.client.get("/dashboard/summary")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["metrics"]["accessible_club_count"], 2)
        self.assertEqual(response.json()["clubs"][0]["manager_name"], "Alex Smith")
        self.assertEqual(response.json()["recent_activity"][0]["type"], "event")

    def test_dashboard_overview_route_scopes_to_club_manager_access(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = build_club_manager_access

        response = self.client.get("/dashboard/summary")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scope"]["primary_role"], "club_manager")
        self.assertEqual(body["scope"]["club_ids"], ["club-2"])
        self.assertEqual(len(body["clubs"]), 1)
        self.assertEqual(body["clubs"][0]["id"], "club-2")

    def test_dashboard_overview_route_preserves_auth_errors(self) -> None:
        def reject_access() -> AppAccess:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ClubCRM access is not provisioned for this account.",
            )

        self.app.dependency_overrides[require_authorized_access] = reject_access

        response = self.client.get("/dashboard/summary")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "ClubCRM access is not provisioned for this account.",
        )

    def test_dashboard_summary_route_returns_summary_and_warms_cache(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access

        response = self.client.get("/dashboard/summary/club-1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "club_id": "club-1",
                "total_members": 18,
                "total_events": 4,
                "total_announcements": 7,
            },
        )
        self.assertIn("club-1", self.cache.values)

    def test_dashboard_redis_analytics_route_returns_cache_metrics(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access
        self.cache.set(
            "club-1",
            DashboardSummary(
                club_id="club-1",
                total_members=18,
                total_events=4,
                total_announcements=7,
            ),
        )

        response = self.client.get("/dashboard/redis-analytics/club-1")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["club_id"], "club-1")
        self.assertTrue(body["available"])
        self.assertTrue(body["cache_present"])
        self.assertEqual(body["status"], "warm")

    def test_dashboard_summary_route_returns_404_for_unknown_club(self) -> None:
        self.app.dependency_overrides[require_authorized_access] = build_org_admin_access

        response = self.client.get("/dashboard/summary/club-404")

        self.assertEqual(response.status_code, 404)
