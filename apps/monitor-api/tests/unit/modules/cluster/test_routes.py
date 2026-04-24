# ruff: noqa: I001, E402
import os
import tempfile
import unittest
from pathlib import Path

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
        self.assertEqual(payload["probes"], [])

    def test_websocket_sends_snapshot_on_connect(self) -> None:
        with self.client.websocket_connect("/ws/stream") as websocket:
            payload = websocket.receive_json()
            self.assertEqual(payload["type"], "snapshot")
            self.assertIn("nodes", payload)
            self.assertIn("pods", payload)
            self.assertIn("volumes", payload)
            self.assertIn("replicas", payload)
            self.assertIn("probes", payload)

    def test_replay_endpoint_returns_empty_replay_when_unconfigured(self) -> None:
        response = self.client.get("/api/replay")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["type"], "replay")
        self.assertEqual(payload["frames"], [])
        self.assertEqual(payload["initial_snapshot"]["type"], "snapshot")

    def test_replay_endpoint_reads_recorded_frames(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            recording_path = Path(tmpdir) / "cluster-session.jsonl"
            recording_path.write_text(
                "\n".join(
                    [
                        '{"type":"snapshot","ts":1000,"nodes":[],"pods":[],"volumes":[],"replicas":[],"probes":[]}',
                        '{"type":"event","ts":1001,"event":{"kind":"NODE_READY","ts":1001,"node":"server1"}}',
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            os.environ["MONITOR_CLUSTER_RECORDING_FILE"] = str(recording_path)
            get_settings.cache_clear()
            app = create_app()
            with TestClient(app) as client:
                response = client.get("/api/replay")

        os.environ.pop("MONITOR_CLUSTER_RECORDING_FILE", None)
        get_settings.cache_clear()

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["initial_snapshot"]["ts"], 1000)
        self.assertEqual(payload["frames"][0]["event"]["kind"], "NODE_READY")


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

    def test_replay_requires_bearer_token(self) -> None:
        response = self.client.get("/api/replay")
        self.assertEqual(response.status_code, 401)
