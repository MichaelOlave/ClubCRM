import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from src.config.settings import KubernetesSettings
from src.modules.monitoring.infrastructure.kubernetes import KubernetesCommandAdapter


class KubernetesCommandAdapterTests(unittest.TestCase):
    def test_fetch_snapshot_reads_storage_details_from_snapshot_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            snapshot_path = Path(temp_dir) / "snapshot.json"
            snapshot_path.write_text(
                json.dumps(
                    {
                        "nodes": [{"name": "vm1", "status": "Ready"}],
                        "pods": [
                            {
                                "namespace": "clubcrm",
                                "name": "clubcrm-api-123",
                                "status": "Running",
                                "node_name": "vm2",
                            }
                        ],
                        "storage_classes": [
                            {
                                "name": "longhorn",
                                "provisioner": "driver.longhorn.io",
                                "is_default": False,
                                "volume_binding_mode": "Immediate",
                                "reclaim_policy": "Delete",
                            }
                        ],
                        "pvcs": [
                            {
                                "namespace": "clubcrm-data",
                                "name": "postgres-data",
                                "status": "Bound",
                                "storage_class_name": "longhorn",
                                "requested_storage": "20Gi",
                                "volume_name": "pvc-123",
                                "volume_status": "Bound",
                            }
                        ],
                        "longhorn_volumes": [
                            {
                                "namespace": "longhorn-system",
                                "name": "pvc-123",
                                "state": "attached",
                                "robustness": "healthy",
                                "size": "21474836480",
                                "node_id": "vm2",
                                "ready": True,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            adapter = KubernetesCommandAdapter(
                KubernetesSettings(
                    snapshot_file=str(snapshot_path),
                    poll_interval_seconds=5.0,
                )
            )

            snapshot = adapter.fetch_snapshot()

        self.assertTrue(snapshot["connected"])
        self.assertEqual(snapshot["source"], "snapshot-file")
        self.assertEqual(snapshot["storage_classes"][0].name, "longhorn")
        self.assertEqual(snapshot["pvcs"][0].volume_name, "pvc-123")
        self.assertTrue(snapshot["longhorn_volumes"][0].ready)

    @patch("src.modules.monitoring.infrastructure.kubernetes.shutil.which")
    def test_fetch_snapshot_returns_unavailable_shape_without_kubectl(self, mock_which) -> None:
        mock_which.return_value = None

        adapter = KubernetesCommandAdapter(
            KubernetesSettings(
                snapshot_file=None,
                poll_interval_seconds=5.0,
            )
        )

        snapshot = adapter.fetch_snapshot()

        self.assertFalse(snapshot["connected"])
        self.assertEqual(snapshot["source"], "unavailable")
        self.assertEqual(snapshot["storage_classes"], [])
        self.assertEqual(snapshot["pvcs"], [])
        self.assertEqual(snapshot["longhorn_volumes"], [])
