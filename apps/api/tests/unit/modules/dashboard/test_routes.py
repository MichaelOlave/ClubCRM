import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_dashboard_repository, get_dashboard_summary_cache
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)
from src.modules.dashboard.domain.models import DashboardRedisAnalytics, DashboardSummary
from src.modules.dashboard.presentation.http.routes import router


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


class FakeDashboardSummaryCache(DashboardSummaryCache):
    def __init__(self) -> None:
        self.values: dict[str, DashboardSummary] = {}

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

    def test_dashboard_summary_route_returns_summary_and_warms_cache(self) -> None:
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
        response = self.client.get("/dashboard/summary/club-404")

        self.assertEqual(response.status_code, 404)
