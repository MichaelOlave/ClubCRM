# ruff: noqa: I001, E402
import os
import unittest

os.environ.setdefault("MONITOR_DISABLE_BACKGROUND_TASKS", "true")
os.environ.setdefault("CLUSTER_VIEWER_PUBLIC", "true")

from fastapi.testclient import TestClient

from src.bootstrap.app_factory import create_app
from src.config import get_settings


class SnapshotRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        get_settings.cache_clear()
        self.app = create_app()
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self) -> None:
        self.client.__exit__(None, None, None)

    def test_snapshot_endpoint_returns_empty_cluster(self) -> None:
        response = self.client.get("/api/snapshot")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["type"], "snapshot")
        self.assertEqual(payload["nodes"], [])
        self.assertEqual(payload["pods"], [])
        self.assertEqual(payload["volumes"], [])
        self.assertEqual(payload["replicas"], [])

    def test_websocket_sends_snapshot_on_connect(self) -> None:
        with self.client.websocket_connect("/ws/stream") as websocket:
            payload = websocket.receive_json()
            self.assertEqual(payload["type"], "snapshot")
            self.assertIn("nodes", payload)
            self.assertIn("pods", payload)
            self.assertIn("volumes", payload)
            self.assertIn("replicas", payload)


class SnapshotAuthTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["CLUSTER_VIEWER_PUBLIC"] = "false"
        os.environ["MONITOR_ADMIN_TOKEN"] = "secret"
        get_settings.cache_clear()
        self.app = create_app()
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self) -> None:
        self.client.__exit__(None, None, None)
        os.environ["CLUSTER_VIEWER_PUBLIC"] = "true"
        os.environ.pop("MONITOR_ADMIN_TOKEN", None)
        get_settings.cache_clear()

    def test_snapshot_requires_bearer_token(self) -> None:
        response = self.client.get("/api/snapshot")
        self.assertEqual(response.status_code, 401)

    def test_snapshot_with_valid_token_returns_data(self) -> None:
        response = self.client.get(
            "/api/snapshot",
            headers={"Authorization": "Bearer secret"},
        )
        self.assertEqual(response.status_code, 200)
