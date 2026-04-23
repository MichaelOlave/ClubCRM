from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol

from src.config.settings import ClusterSettings


class KubernetesClientProtocol(Protocol):
    def list_node(self, **kwargs) -> object: ...
    def list_pod_for_all_namespaces(self, **kwargs) -> object: ...


class CustomObjectsClientProtocol(Protocol):
    def list_cluster_custom_object(self, **kwargs) -> object: ...


class KubernetesWatchAdapter:
    """Thin wrapper around the official `kubernetes` client.

    Import of `kubernetes` is deferred to `load_client()` so the rest of the
    app (and its tests) can be imported without the package installed.
    """

    def __init__(self, settings: ClusterSettings) -> None:
        self._settings = settings
        self._core_v1: KubernetesClientProtocol | None = None
        self._custom_objects: CustomObjectsClientProtocol | None = None
        self._serializer = None

    def load_client(self) -> KubernetesClientProtocol:
        if self._core_v1 is not None:
            return self._core_v1
        self._load_clients()
        assert self._core_v1 is not None
        return self._core_v1

    def load_custom_objects_client(self) -> CustomObjectsClientProtocol:
        if self._custom_objects is not None:
            return self._custom_objects
        self._load_clients()
        assert self._custom_objects is not None
        return self._custom_objects

    def _load_clients(self) -> None:
        if self._core_v1 is not None and self._custom_objects is not None:
            return

        from kubernetes import client, config  # type: ignore[import-not-found]

        if self._settings.in_cluster:
            config.load_incluster_config()
        else:
            config.load_kube_config(
                config_file=self._settings.kubeconfig_path,
                context=self._settings.context,
            )
        self._core_v1 = client.CoreV1Api()
        self._custom_objects = client.CustomObjectsApi()
        self._serializer = client.ApiClient()

    def list_nodes(self) -> list[dict]:
        items, _resource_version = self.list_nodes_with_resource_version()
        return items

    def list_nodes_with_resource_version(self) -> tuple[list[dict], str | None]:
        core_v1 = self.load_client()
        response = core_v1.list_node()
        metadata = getattr(response, "metadata", None)
        return (
            [self._to_api_dict(item) for item in response.items],
            getattr(metadata, "resource_version", None),
        )

    def list_pods(self) -> list[dict]:
        items, _resource_version = self.list_pods_with_resource_version()
        return items

    def list_pods_with_resource_version(self) -> tuple[list[dict], str | None]:
        core_v1 = self.load_client()
        response = core_v1.list_pod_for_all_namespaces()
        metadata = getattr(response, "metadata", None)
        return (
            [self._to_api_dict(item) for item in response.items],
            getattr(metadata, "resource_version", None),
        )

    def list_longhorn_volumes_with_resource_version(self) -> tuple[list[dict], str | None]:
        return self._list_longhorn_custom_objects(plural="volumes")

    def list_longhorn_replicas_with_resource_version(self) -> tuple[list[dict], str | None]:
        return self._list_longhorn_custom_objects(plural="replicas")

    def stream_nodes(
        self, *, resource_version: str | None = None
    ) -> Iterator[tuple[str, dict]]:
        return self._stream(resource="node", resource_version=resource_version)

    def stream_pods(self, *, resource_version: str | None = None) -> Iterator[tuple[str, dict]]:
        return self._stream(resource="pod", resource_version=resource_version)

    def stream_longhorn_volumes(
        self, *, resource_version: str | None = None
    ) -> Iterator[tuple[str, dict]]:
        return self._stream(resource="longhorn_volume", resource_version=resource_version)

    def stream_longhorn_replicas(
        self, *, resource_version: str | None = None
    ) -> Iterator[tuple[str, dict]]:
        return self._stream(resource="longhorn_replica", resource_version=resource_version)

    def _stream(
        self, *, resource: str, resource_version: str | None = None
    ) -> Iterator[tuple[str, dict]]:
        from kubernetes import watch  # type: ignore[import-not-found]

        core_v1 = self.load_client()
        watcher = watch.Watch()
        if resource == "node":
            func = core_v1.list_node
            kwargs = {}
        elif resource == "pod":
            func = core_v1.list_pod_for_all_namespaces
            kwargs = {}
        else:
            custom_objects = self.load_custom_objects_client()
            plural = "volumes" if resource == "longhorn_volume" else "replicas"
            func = custom_objects.list_cluster_custom_object
            kwargs = {
                "group": "longhorn.io",
                "version": "v1beta2",
                "plural": plural,
            }
        for event in watcher.stream(
            func,
            **kwargs,
            resource_version=resource_version,
            timeout_seconds=self._settings.watch_timeout_seconds,
        ):
            event_type = event.get("type", "UNKNOWN")
            raw = self._to_api_dict(event.get("object"))
            yield event_type, raw

    def _list_longhorn_custom_objects(self, *, plural: str) -> tuple[list[dict], str | None]:
        custom_objects = self.load_custom_objects_client()
        response = custom_objects.list_cluster_custom_object(
            group="longhorn.io",
            version="v1beta2",
            plural=plural,
        )
        metadata = response.get("metadata") or {}
        items = response.get("items") or []
        return (
            [item for item in items if isinstance(item, dict)],
            metadata.get("resourceVersion")
            if isinstance(metadata.get("resourceVersion"), str)
            else None,
        )

    def _to_api_dict(self, obj: object) -> dict:
        if obj is None:
            return {}
        if isinstance(obj, dict):
            return obj
        if self._serializer is not None:
            payload = self._serializer.sanitize_for_serialization(obj)
            if isinstance(payload, dict):
                return payload
        to_dict = getattr(obj, "to_dict", None)
        if callable(to_dict):
            result = to_dict()
            if isinstance(result, dict):
                return result
        return {}
