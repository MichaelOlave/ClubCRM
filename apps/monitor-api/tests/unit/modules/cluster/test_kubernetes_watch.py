import unittest
from types import SimpleNamespace
from unittest.mock import patch

from src.config.settings import ClusterSettings
from src.modules.cluster.infrastructure.kubernetes_watch import KubernetesWatchAdapter


def _settings() -> ClusterSettings:
    return ClusterSettings(
        kubeconfig_path=None,
        context=None,
        in_cluster=False,
        snapshot_file=None,
        longhorn_enabled=True,
        heartbeat_seconds=5.0,
        watch_timeout_seconds=300,
    )


class KubernetesWatchAdapterTests(unittest.TestCase):
    def test_list_nodes_serializes_items(self) -> None:
        adapter = KubernetesWatchAdapter(_settings())
        fake_client = SimpleNamespace(
            list_node=lambda **_: SimpleNamespace(
                items=[SimpleNamespace(to_dict=lambda: {"metadata": {"name": "a"}})],
                metadata=SimpleNamespace(resource_version="55"),
            )
        )
        adapter._core_v1 = fake_client  # type: ignore[assignment]

        result = adapter.list_nodes()
        self.assertEqual(result, [{"metadata": {"name": "a"}}])

    def test_list_nodes_with_resource_version_returns_metadata(self) -> None:
        adapter = KubernetesWatchAdapter(_settings())
        fake_client = SimpleNamespace(
            list_node=lambda **_: SimpleNamespace(
                items=[SimpleNamespace(to_dict=lambda: {"metadata": {"name": "a"}})],
                metadata=SimpleNamespace(resource_version="55"),
            )
        )
        adapter._core_v1 = fake_client  # type: ignore[assignment]

        result, resource_version = adapter.list_nodes_with_resource_version()
        self.assertEqual(result, [{"metadata": {"name": "a"}}])
        self.assertEqual(resource_version, "55")

    def test_stream_nodes_yields_normalized_events(self) -> None:
        adapter = KubernetesWatchAdapter(_settings())
        fake_client = SimpleNamespace(
            list_node=lambda **_: None,
            list_pod_for_all_namespaces=lambda **_: None,
        )
        adapter._core_v1 = fake_client  # type: ignore[assignment]

        raw_event = {
            "type": "ADDED",
            "object": SimpleNamespace(to_dict=lambda: {"metadata": {"name": "server1"}}),
        }

        class FakeWatch:
            def stream(self, *_args, **kwargs):
                self.kwargs = kwargs
                yield raw_event

        fake_watch_module = SimpleNamespace(Watch=FakeWatch)
        fake_kubernetes = SimpleNamespace(watch=fake_watch_module)
        with patch.dict(
            "sys.modules",
            {"kubernetes": fake_kubernetes, "kubernetes.watch": fake_watch_module},
        ):
            events = list(adapter.stream_nodes(resource_version="90"))

        self.assertEqual(events, [("ADDED", {"metadata": {"name": "server1"}})])

    def test_lists_longhorn_volumes(self) -> None:
        adapter = KubernetesWatchAdapter(_settings())
        adapter._custom_objects = SimpleNamespace(  # type: ignore[assignment]
            list_cluster_custom_object=lambda **_: {
                "metadata": {"resourceVersion": "77"},
                "items": [{"metadata": {"name": "volume-a"}}],
            }
        )

        result, resource_version = adapter.list_longhorn_volumes_with_resource_version()
        self.assertEqual(result, [{"metadata": {"name": "volume-a"}}])
        self.assertEqual(resource_version, "77")
